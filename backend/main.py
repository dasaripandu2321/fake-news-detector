from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from google import genai as google_genai
import re
import json
import hashlib
import math
import csv
from pathlib import Path
from urllib.parse import urlparse
from collections import defaultdict

app = FastAPI(title="Fake News Detector API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ---------------------------------------------------------------------------
# Credible domains whitelist
# ---------------------------------------------------------------------------
CREDIBLE_DOMAINS = {
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "npr.org",
    "theguardian.com", "nytimes.com", "washingtonpost.com", "wsj.com",
    "bloomberg.com", "economist.com", "ft.com", "time.com", "forbes.com",
    "nature.com", "science.org", "scientificamerican.com", "newscientist.com",
    "pbs.org", "cbsnews.com", "nbcnews.com", "abcnews.go.com", "cnn.com",
    "politico.com", "thehill.com", "axios.com", "vox.com", "theatlantic.com",
    "newyorker.com", "usatoday.com", "latimes.com", "independent.co.uk",
    "dw.com", "france24.com", "aljazeera.com", "who.int", "cdc.gov",
    "nih.gov", "nasa.gov", "un.org", "factcheck.org", "snopes.com",
    "politifact.com", "fullfact.org",
}

# ---------------------------------------------------------------------------
# Bias / sensational keywords
# ---------------------------------------------------------------------------
BIAS_KEYWORDS = {
    "shocking", "secret", "exposed", "miracle", "conspiracy", "leaked",
    "exclusive", "hidden", "cover-up", "scandal", "baffled", "weird",
    "refuses", "whistleblower", "deep state", "mainstream media",
    "unbelievable", "bombshell", "breaking", "urgent", "alert",
    "they don't want you to know", "wake up", "sheeple", "hoax",
    "fake", "rigged", "stolen", "corrupt", "agenda", "propaganda",
}

FACTUAL_MARKERS = [
    "according to", "said", "reported", "announced", "percent", "study",
    "research", "official", "government", "university", "published",
    "data", "statistics", "survey", "confirmed", "statement", "press release",
    "spokesperson", "committee", "congress", "senate", "parliament",
    "department", "agency", "institute", "journal", "findings", "analysis",
    "report", "investigation", "evidence", "source", "cited", "noted",
    "stated", "added", "told reporters", "in a statement", "according",
]

# ---------------------------------------------------------------------------
# Tiny Naive Bayes — trains in <1s, uses <30MB RAM
# ---------------------------------------------------------------------------
DATA_PATH = Path(__file__).parent / "data" / "fake_or_real_news.csv"

class NaiveBayes:
    def __init__(self):
        self.log_priors = {}
        self.log_likelihoods = {}
        self.vocab = set()

    def _tokenize(self, text):
        return re.findall(r"\b[a-z]{2,}\b", text.lower())

    def fit(self, texts, labels):
        counts = defaultdict(lambda: defaultdict(int))
        class_totals = defaultdict(int)
        class_counts = defaultdict(int)

        for text, label in zip(texts, labels):
            tokens = self._tokenize(text)
            class_counts[label] += 1
            for tok in tokens:
                counts[label][tok] += 1
                class_totals[label] += 1
                self.vocab.add(tok)

        total_docs = sum(class_counts.values())
        vocab_size = len(self.vocab)

        for label in class_counts:
            self.log_priors[label] = math.log(class_counts[label] / total_docs)
            self.log_likelihoods[label] = {}
            for word in self.vocab:
                # Laplace smoothing
                self.log_likelihoods[label][word] = math.log(
                    (counts[label][word] + 1) / (class_totals[label] + vocab_size)
                )
            # OOV token
            self.log_likelihoods[label]["<OOV>"] = math.log(
                1 / (class_totals[label] + vocab_size)
            )

    def predict_proba(self, text):
        tokens = self._tokenize(text)
        scores = {}
        for label in self.log_priors:
            score = self.log_priors[label]
            ll = self.log_likelihoods[label]
            for tok in tokens:
                score += ll.get(tok, ll["<OOV>"])
            scores[label] = score

        # Convert log scores to probabilities via softmax
        max_score = max(scores.values())
        exp_scores = {k: math.exp(v - max_score) for k, v in scores.items()}
        total = sum(exp_scores.values())
        return {k: v / total for k, v in exp_scores.items()}


def _load_csv_lightweight():
    """Read CSV without pandas — saves ~100MB RAM."""
    if not DATA_PATH.exists():
        return None, None
    texts, labels = [], []
    with open(DATA_PATH, encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row.get("title", "")
            text  = row.get("text", "")[:800]   # cap at 800 chars per article
            label = row.get("label", "").strip().upper()
            if label in ("FAKE", "REAL"):
                texts.append(f"{title} {text}")
                labels.append(label)
    print(f"[model] Loaded {len(texts)} samples (lightweight CSV reader).")
    return texts, labels


print("[model] Training Naive Bayes...")
_texts, _labels = _load_csv_lightweight()
if _texts:
    nb_model = NaiveBayes()
    nb_model.fit(_texts, _labels)
    print(f"[model] Trained. Vocab size: {len(nb_model.vocab)}")
else:
    print("[model] WARNING: No data, using fallback.")
    nb_model = NaiveBayes()
    nb_model.fit(
        ["shocking conspiracy leaked deep state hoax rigged corrupt bombshell wake up sheeple",
         "according to officials the senate passed the bill researchers published findings"],
        ["FAKE", "REAL"]
    )

sentiment_analyzer = SentimentIntensityAnalyzer()

# ---------------------------------------------------------------------------
# Gemini AI client
# ---------------------------------------------------------------------------
GEMINI_API_KEY = "AIzaSyAVKrIqWlon_NQOGtadqy4UTgOzWgfy5ZA"
GEMINI_MODEL   = "models/gemini-2.0-flash-lite"
_gemini_cache: dict[str, dict] = {}
_gemini_last_call: float = 0.0

GEMINI_PROMPT = """You are a professional fact-checker. Analyze this news article and determine if it is REAL or FAKE.

Respond ONLY with valid JSON (no markdown):
{{"prediction":"FAKE" or "REAL","confidence":<50-99>,"reasoning":"<one sentence>","red_flags":["<flag1>"]}}

Article:
{text}"""


async def gemini_predict(text: str) -> dict | None:
    global _gemini_last_call
    import time, asyncio

    snippet = text[:1500]
    cache_key = hashlib.md5(snippet.encode()).hexdigest()
    if cache_key in _gemini_cache:
        return _gemini_cache[cache_key]

    elapsed = time.time() - _gemini_last_call
    if elapsed < 4:
        await asyncio.sleep(4 - elapsed)

    try:
        client = google_genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=GEMINI_PROMPT.format(text=snippet),
        )
        _gemini_last_call = time.time()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.text.strip(), flags=re.MULTILINE).strip()
        data = json.loads(raw)
        result = {
            "prediction": data.get("prediction", "FAKE").upper(),
            "confidence": int(data.get("confidence", 70)),
            "reasoning":  data.get("reasoning", ""),
            "red_flags":  data.get("red_flags", []),
        }
        _gemini_cache[cache_key] = result
        print(f"[gemini] {result['prediction']} {result['confidence']}%")
        return result
    except Exception as e:
        print(f"[gemini] unavailable: {e}")
        return None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def extract_bias_keywords(text: str) -> list[str]:
    lower = text.lower()
    return [kw for kw in BIAS_KEYWORDS if kw in lower]

def get_sentiment(text: str) -> dict:
    scores = sentiment_analyzer.polarity_scores(text)
    c = scores["compound"]
    label = "Positive" if c >= 0.05 else "Negative" if c <= -0.05 else "Neutral"
    return {"score": round(c, 3), "label": label, "detail": scores}

def check_source(url: str) -> dict:
    try:
        domain = (urlparse(url).hostname or "").removeprefix("www.")
        return {"domain": domain, "verified": domain in CREDIBLE_DOMAINS}
    except Exception:
        return {"domain": "", "verified": False}

def ml_predict(text: str) -> dict:
    proba = nb_model.predict_proba(text)
    prob_real = proba.get("REAL", 0.5)
    prob_fake = proba.get("FAKE", 0.5)

    lower = text.lower()
    bias_hits   = len(extract_bias_keywords(text))
    factual_hits = sum(1 for m in FACTUAL_MARKERS if m in lower)
    sentiment   = get_sentiment(text)
    caps_words  = len(re.findall(r'\b[A-Z]{3,}\b', text))

    # Rule overrides
    if bias_hits >= 5:
        prob_fake = max(prob_fake, 0.95)
    elif bias_hits >= 3:
        prob_fake = max(prob_fake, 0.88)
    elif bias_hits >= 1:
        prob_fake = max(prob_fake, prob_fake + 0.06)

    if caps_words >= 4 and len(text.split()) < 300:
        prob_fake = max(prob_fake, 0.82)

    if sentiment["score"] < -0.5 and bias_hits >= 2:
        prob_fake = max(prob_fake, 0.85)

    if bias_hits == 0 and factual_hits >= 6:
        prob_real = max(prob_real, 0.92)
    elif bias_hits == 0 and factual_hits >= 4:
        prob_real = max(prob_real, 0.85)
    elif bias_hits == 0 and factual_hits >= 2:
        prob_real = max(prob_real, 0.75)
    elif bias_hits == 0 and factual_hits >= 1:
        prob_real = max(prob_real, 0.62)

    prob_fake = 1 - prob_real if prob_real > 0.5 else prob_fake
    prob_real = 1 - prob_fake if prob_fake > 0.5 else prob_real
    total = prob_real + prob_fake
    prob_real /= total
    prob_fake /= total

    label = "REAL" if prob_real >= 0.5 else "FAKE"
    confidence = round((prob_real if label == "REAL" else prob_fake) * 100, 1)

    if label == "FAKE":
        reasons = []
        if bias_hits: reasons.append(f"{bias_hits} sensational keyword(s)")
        if caps_words >= 4: reasons.append("excessive capitalization")
        if sentiment["score"] < -0.4: reasons.append("highly negative tone")
        reasoning = "Flagged as likely fake: " + ("; ".join(reasons) or "ML pattern match.")
    else:
        reasons = []
        if factual_hits >= 2: reasons.append(f"{factual_hits} factual markers")
        if bias_hits == 0: reasons.append("no sensational keywords")
        reasoning = "Appears credible: " + ("; ".join(reasons) or "ML pattern match.")

    return {
        "prediction":     label,
        "confidence":     confidence,
        "prob_real":      round(prob_real * 100, 1),
        "prob_fake":      round(prob_fake * 100, 1),
        "reasoning":      reasoning,
        "red_flags":      extract_bias_keywords(text)[:5],
        "sentiment":      sentiment,
        "flagged_tokens": extract_bias_keywords(text),
        "source_status":  None,
        "engine":         "ml",
    }

async def run_prediction(text: str) -> dict:
    ai = await gemini_predict(text)
    if ai:
        prob_real = ai["confidence"] / 100 if ai["prediction"] == "REAL" else 1 - ai["confidence"] / 100
        return {
            "prediction":     ai["prediction"],
            "confidence":     ai["confidence"],
            "prob_real":      round(prob_real * 100, 1),
            "prob_fake":      round((1 - prob_real) * 100, 1),
            "reasoning":      ai["reasoning"],
            "red_flags":      ai["red_flags"],
            "sentiment":      get_sentiment(text),
            "flagged_tokens": extract_bias_keywords(text),
            "source_status":  None,
            "engine":         "gemini",
        }
    return ml_predict(text)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
class TextRequest(BaseModel):
    text: str

class UrlRequest(BaseModel):
    url: str

@app.post("/analyze/text")
async def analyze_text(req: TextRequest):
    if len(req.text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Text too short.")
    return await run_prediction(req.text)

@app.post("/analyze/headline")
async def analyze_headline(req: TextRequest):
    first = re.split(r"(?<=[.!?])\s", req.text.strip())[0]
    if len(first.strip()) < 10:
        raise HTTPException(status_code=400, detail="Could not extract headline.")
    result = await run_prediction(first)
    result["headline"] = first
    return result

@app.post("/analyze/url")
async def analyze_url(req: UrlRequest):
    source = check_source(req.url)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(req.url, follow_redirects=True)
            resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {e}")
    soup = BeautifulSoup(resp.text, "html.parser")
    text = " ".join(p.get_text() for p in soup.find_all(["p", "article"]))
    if len(text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Could not extract text from URL.")
    result = await run_prediction(text)
    result["source_status"] = source
    return result

@app.get("/status")
async def status():
    return {"status": "ok", "vocab_size": len(nb_model.vocab), "model": "NaiveBayes+rules"}

@app.post("/cache/clear")
async def clear_cache():
    _gemini_cache.clear()
    return {"cleared": True}
