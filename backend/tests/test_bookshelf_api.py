from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.database import get_session
from app.main import app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def override_session() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_resource_can_be_placed_in_multiple_books(client: TestClient) -> None:
    first_book = client.post("/books", json={"title": "AI Basics", "color": "#b76e79"}).json()
    second_book = client.post("/books", json={"title": "Research", "color": "#6f8f72"}).json()

    first_section = client.post(
        f"/books/{first_book['id']}/sections", json={"title": "Foundations"}
    ).json()
    second_section = client.post(
        f"/books/{second_book['id']}/sections", json={"title": "Papers"}
    ).json()

    resource = client.post(
        "/resources",
        json={
            "url": "https://example.com/article",
            "title": "Useful Article",
            "source_type": "article",
            "tag_names": ["AI", "Basics"],
        },
    ).json()

    client.post(
        "/placements",
        json={"resource_id": resource["id"], "section_id": first_section["id"]},
    )
    client.post(
        "/placements",
        json={"resource_id": resource["id"], "section_id": second_section["id"]},
    )

    first_detail = client.get(f"/books/{first_book['id']}").json()
    second_detail = client.get(f"/books/{second_book['id']}").json()

    assert first_detail["sections"][0]["placements"][0]["resource"]["title"] == "Useful Article"
    assert second_detail["sections"][0]["placements"][0]["resource"]["title"] == "Useful Article"
    assert [tag["name"] for tag in resource["tags"]] == ["ai", "basics"]


def test_duplicate_resource_url_is_rejected(client: TestClient) -> None:
    payload = {"url": "https://example.com/reused", "title": "One"}
    assert client.post("/resources", json=payload).status_code == 201
    response = client.post("/resources", json=payload)
    assert response.status_code == 409


def test_duplicate_book_title_is_rejected(client: TestClient) -> None:
    assert client.post("/books", json={"title": "AI Resources"}).status_code == 201
    response = client.post("/books", json={"title": " ai   resources "})
    assert response.status_code == 409


def test_resources_with_placements_includes_book_and_section_membership(
    client: TestClient,
) -> None:
    book = client.post("/books", json={"title": "AI Basics", "color": "#b76e79"}).json()
    section = client.post(
        f"/books/{book['id']}/sections", json={"title": "Foundations"}
    ).json()
    placed_resource = client.post(
        "/resources",
        json={
            "url": "https://example.com/placed",
            "title": "Placed Resource",
            "tag_names": ["AI"],
        },
    ).json()
    unplaced_resource = client.post(
        "/resources",
        json={"url": "https://example.com/unplaced", "title": "Unplaced Resource"},
    ).json()
    placement = client.post(
        "/placements",
        json={"resource_id": placed_resource["id"], "section_id": section["id"]},
    ).json()

    resources = client.get("/resources/with-placements").json()

    placed = next(resource for resource in resources if resource["id"] == placed_resource["id"])
    unplaced = next(resource for resource in resources if resource["id"] == unplaced_resource["id"])
    assert placed["placements"] == [
        {
            "placement_id": placement["id"],
            "book_id": book["id"],
            "book_title": "AI Basics",
            "section_id": section["id"],
            "section_title": "Foundations",
        }
    ]
    assert placed["tags"] == [{"id": placed["tags"][0]["id"], "name": "ai"}]
    assert unplaced["placements"] == []
