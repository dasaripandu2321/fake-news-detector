from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from google import genai as google_genai
import numpy as np
import re
import json
import hashlib
import pandas as pd
from pathlib import Path
from urllib.parse import urlparse

app = FastAPI(title="Fake News Detector API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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
    "politico.com", "thehill.com", "axios.com", "vox.com", "slate.com",
    "theatlantic.com", "newyorker.com", "usatoday.com", "latimes.com",
    "chicagotribune.com", "bostonglobe.com", "sfchronicle.com",
    "independent.co.uk", "telegraph.co.uk", "thetimes.co.uk",
    "dw.com", "france24.com", "aljazeera.com", "euronews.com",
    "who.int", "cdc.gov", "nih.gov", "nasa.gov", "un.org",
    "factcheck.org", "snopes.com", "politifact.com", "fullfact.org",
}

# ---------------------------------------------------------------------------
# Bias / sensational keyword list
# ---------------------------------------------------------------------------
BIAS_KEYWORDS = {
    "shocking", "secret", "exposed", "miracle", "conspiracy", "leaked",
    "exclusive", "hidden", "cover-up", "scandal", "baffled", "weird",
    "refuses", "whistleblower", "deep state", "mainstream media",
    "unbelievable", "bombshell", "breaking", "urgent", "alert",
    "they don't want you to know", "wake up", "sheeple", "hoax",
    "fake", "rigged", "stolen", "corrupt", "agenda", "propaganda",
}

# Strong factual language markers
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
# Train on real labeled dataset (fake_or_real_news.csv — 6335 articles)
# ---------------------------------------------------------------------------
DATA_PATH = Path(__file__).parent / "data" / "fake_or_real_news.csv"

def _load_training_data():
    if DATA_PATH.exists():
        df = pd.read_csv(DATA_PATH)
        texts = (df["title"].fillna("") + " " + df["text"].fillna("")).tolist()
        labels = df["label"].tolist()
        print(f"[model] Loaded {len(texts)} samples from dataset.")
        return texts, labels
    print("[model] WARNING: Dataset not found, using fallback corpus.")
    fake = [
        "shocking secret government hiding truth exposed deep state plot uncovered",
        "miracle cure doctors don't want you to know big pharma suppressing treatment",
        "breaking exclusive leaked documents reveal massive conspiracy cover-up",
        "wake up sheeple the truth about vaccines they are hiding from you",
        "unbelievable bombshell corrupt officials caught red handed scandal exposed",
    ]
    real = [
        "the senate passed the bipartisan infrastructure bill with 69 votes on tuesday",
        "the federal reserve raised interest rates by 25 basis points citing inflation",
        "researchers published peer reviewed findings in the new england journal of medicine",
        "supreme court ruled in favor of upholding the affordable care act provisions",
        "international climate summit concluded with new emissions reduction commitments",
    ]
    return fake + real, ["FAKE"] * len(fake) + ["REAL"] * len(real)

_texts, _labels = _load_training_data()

# Use LogisticRegression — much better calibrated probabilities than SGD
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=100_000,
        sublinear_tf=True,
        min_df=2,
        strip_accents="unicode",
        analyzer="word",
        token_pattern=r"\b[a-zA-Z][a-zA-Z0-9]{1,}\b",
    )),
    ("clf", LogisticRegression(
        C=5.0,
        max_iter=1000,
        solver="lbfgs",
        class_weight="balanced",
        random_state=42,
    )),
])

pipeline.fit(_texts, _labels)
print("[model] Training complete (LogisticRegression).")

sentiment_analyzer = SentimentIntensityAnalyzer()

# ---------------------------------------------------------------------------
# Gemini AI client — replace key here when you get a new one
# ---------------------------------------------------------------------------
GEMINI_API_KEY = "AIzaSyAVKrIqWlon_NQOGtadqy4UTgOzWgfy5ZA"
GEMINI_MODEL   = "models/gemini-2.0-flash-lite"
_gemini_cache: dict[str, dict] = {}
_gemini_last_call: float = 0.0

GEMINI_PROMPT = """You are a professional fact-checker and media literacy expert.
Analyze the following news article and determine if it is REAL or FAKE news.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{{
  "prediction": "FAKE" or "REAL",
  "confidence": <integer 50-99>,
  "reasoning": "<one sentence explanation>",
  "red_flags": ["<flag1>", "<flag2>"]
}}

Article:
{text}"""


async def gemini_predict(text: str) -> dict | None:
    global _gemini_last_call
    import time

    snippet = text[:1500]
    cache_key = hashlib.md5(snippet.encode()).hexdigest()

    if cache_key in _gemini_cache:
        print("[gemini] cache hit")
        return _gemini_cache[cache_key]

    elapsed = time.time() - _gemini_last_call
    if elapsed < 4:
        await __import__("asyncio").sleep(4 - elapsed)

    try:
        _client = google_genai.Client(api_key=GEMINI_API_KEY)
        prompt = GEMINI_PROMPT.format(text=snippet)
        response = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        _gemini_last_call = time.time()
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        data = json.loads(raw)
        result = {
            "prediction": data.get("prediction", "FAKE").upper(),
            "confidence": int(data.get("confidence", 70)),
            "reasoning":  data.get("reasoning", ""),
            "red_flags":  data.get("red_flags", []),
        }
        _gemini_cache[cache_key] = result
        print(f"[gemini] success — {result['prediction']} {result['confidence']}%")
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
    compound = scores["compound"]
    label = "Positive" if compound >= 0.05 else "Negative" if compound <= -0.05 else "Neutral"
    return {"score": round(compound, 3), "label": label, "detail": scores}


def check_source(url: str) -> dict:
    try:
        host = urlparse(url).hostname or ""
        domain = host.removeprefix("www.")
        return {"domain": domain, "verified": domain in CREDIBLE_DOMAINS}
    except Exception:
        return {"domain": "", "verified": False}


def ml_predict(text: str) -> dict:
    """ML prediction with strong rule-based override layer."""
    proba = pipeline.predict_proba([text])[0]
    classes = list(pipeline.classes_)
    prob_real = float(proba[classes.index("REAL")])
    prob_fake = float(proba[classes.index("FAKE")])

    lower = text.lower()
    bias_hits = len(extract_bias_keywords(text))
    factual_hits = sum(1 for m in FACTUAL_MARKERS if m in lower)
    sentiment = get_sentiment(text)
    word_count = len(text.split())
    caps_words = len(re.findall(r'\b[A-Z]{3,}\b', text))

    # -----------------------------------------------------------------------
    # RULE LAYER — these override the ML when signals are strong
    # -----------------------------------------------------------------------

    # FAKE signals (strong)
    if bias_hits >= 5:
        prob_fake = max(prob_fake, 0.95)
        prob_real = 1 - prob_fake
    elif bias_hits >= 3:
        prob_fake = max(prob_fake, 0.88)
        prob_real = 1 - prob_fake
    elif bias_hits >= 1:
        prob_fake = max(prob_fake, prob_fake + 0.08)
        prob_real = 1 - prob_fake

    # Clickbait caps + short text
    if caps_words >= 4 and word_count < 300:
        prob_fake = max(prob_fake, 0.82)
        prob_real = 1 - prob_fake

    # Highly emotional negative + bias = fake
    if sentiment["score"] < -0.5 and bias_hits >= 2:
        prob_fake = max(prob_fake, 0.85)
        prob_real = 1 - prob_fake

    # REAL signals (strong) — factual language with no bias overrides ML
    if bias_hits == 0 and factual_hits >= 6:
        prob_real = max(prob_real, 0.92)
        prob_fake = 1 - prob_real
    elif bias_hits == 0 and factual_hits >= 4:
        prob_real = max(prob_real, 0.85)
        prob_fake = 1 - prob_real
    elif bias_hits == 0 and factual_hits >= 2:
        prob_real = max(prob_real, 0.75)
        prob_fake = 1 - prob_real
    elif bias_hits == 0 and factual_hits >= 1:
        # Mild nudge toward real when no bias at all
        prob_real = max(prob_real, 0.60)
        prob_fake = 1 - prob_real

    # Normalize
    total = prob_real + prob_fake
    prob_real /= total
    prob_fake /= total

    label = "REAL" if prob_real >= 0.5 else "FAKE"
    confidence = round(prob_real * 100, 1) if label == "REAL" else round(prob_fake * 100, 1)

    # Build reasoning
    if label == "FAKE":
        reasons = []
        if bias_hits > 0:
            reasons.append(f"{bias_hits} sensational keyword(s) detected")
        if caps_words >= 4:
            reasons.append("excessive capitalization (clickbait pattern)")
        if sentiment["score"] < -0.4:
            reasons.append("highly negative emotional tone")
        reasoning = "Flagged as likely fake: " + ("; ".join(reasons) if reasons else "ML model pattern match.")
    else:
        reasons = []
        if factual_hits >= 2:
            reasons.append(f"{factual_hits} factual language markers found")
        if bias_hits == 0:
            reasons.append("no sensational keywords detected")
        reasoning = "Appears credible: " + ("; ".join(reasons) if reasons else "ML model pattern match.")

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
    # Try Gemini first
    ai = await gemini_predict(text)

    if ai:
        prob_real = ai["confidence"] / 100 if ai["prediction"] == "REAL" else 1 - ai["confidence"] / 100
        return {
            "prediction":   ai["prediction"],
            "confidence":   ai["confidence"],
            "prob_real":    round(prob_real * 100, 1),
            "prob_fake":    round((1 - prob_real) * 100, 1),
            "reasoning":    ai["reasoning"],
            "red_flags":    ai["red_flags"],
            "sentiment":    get_sentiment(text),
            "flagged_tokens": extract_bias_keywords(text),
            "source_status": None,
            "engine":       "gemini",
        }

    # Fallback: improved ML model
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
        raise HTTPException(status_code=400, detail="Text too short to analyze.")
    return await run_prediction(req.text)


@app.post("/analyze/headline")
async def analyze_headline(req: TextRequest):
    first = re.split(r"(?<=[.!?])\s", req.text.strip())[0]
    if len(first.strip()) < 10:
        raise HTTPException(status_code=400, detail="Could not extract a headline.")
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
    paragraphs = soup.find_all(["p", "article"])
    text = " ".join(p.get_text() for p in paragraphs)

    if len(text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Could not extract enough text from URL.")

    result = await run_prediction(text)
    result["source_status"] = source
    return result


@app.get("/status")
async def status():
    return {
        "status": "ok",
        "cache_size": len(_gemini_cache),
        "model": GEMINI_MODEL,
        "gemini_key_set": bool(GEMINI_API_KEY),
    }

@app.post("/cache/clear")
async def clear_cache():
    _gemini_cache.clear()
    return {"cleared": True}
