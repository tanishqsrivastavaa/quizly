from __future__ import annotations

import fitz
from fastapi.testclient import TestClient


def build_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    return doc.tobytes()


def test_upload_and_ingest_document(client: TestClient, auth_headers: dict[str, str]):
    pdf = build_pdf_bytes("Photosynthesis converts light to chemical energy in plants.")
    upload = client.post(
        "/v1/documents/upload",
        files={"file": ("biology.pdf", pdf, "application/pdf")},
        headers=auth_headers,
    )
    assert upload.status_code == 202
    document_id = upload.json()["id"]

    response = client.get(f"/v1/documents/{document_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] in {"queued", "processing", "ready"}
