from __future__ import annotations

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import Response

ingestion_latency_seconds = Histogram(
    "quizly_ingestion_latency_seconds",
    "End-to-end document ingestion latency in seconds.",
)
retrieval_latency_seconds = Histogram(
    "quizly_retrieval_latency_seconds",
    "Context retrieval latency in seconds.",
)
quiz_score_distribution = Histogram(
    "quizly_quiz_score_distribution",
    "Distribution of answer evaluation scores.",
    buckets=(0.0, 0.25, 0.5, 0.8, 1.0),
)
session_completion_total = Counter(
    "quizly_session_completion_total",
    "Total completed quiz sessions.",
)
ingestion_failures_total = Counter(
    "quizly_ingestion_failures_total",
    "Total failed ingestion jobs.",
)


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
