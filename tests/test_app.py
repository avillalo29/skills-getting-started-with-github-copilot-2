from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


ACTIVITY_NAME = "Soccer Team"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(app_module, "activities", deepcopy(app_module.activities))
    return TestClient(app_module.app)


def test_root_redirects_to_activity_page(client):
    # Arrange
    expected_location = "/static/index.html"

    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == expected_location


def test_get_activities_returns_activity_data(client):
    # Arrange
    expected_activity = ACTIVITY_NAME

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert expected_activity in response.json()
    assert response.json()[expected_activity]["participants"] == []


def test_signup_adds_participant(client):
    # Arrange
    email = "new-student@example.com"
    activity_path = quote(ACTIVITY_NAME, safe="")

    # Act
    response = client.post(
        f"/activities/{activity_path}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for {ACTIVITY_NAME}"}
    assert app_module.activities[ACTIVITY_NAME]["participants"] == [email]


def test_signup_rejects_duplicate_participant(client):
    # Arrange
    email = "existing-student@example.com"
    activity_path = quote(ACTIVITY_NAME, safe="")
    app_module.activities[ACTIVITY_NAME]["participants"].append(email)

    # Act
    response = client.post(
        f"/activities/{activity_path}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for this activity"
    assert app_module.activities[ACTIVITY_NAME]["participants"].count(email) == 1


def test_signup_returns_404_for_unknown_activity(client):
    # Arrange
    activity_path = quote("Unknown Activity", safe="")

    # Act
    response = client.post(
        f"/activities/{activity_path}/signup",
        params={"email": "student@example.com"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_remove_participant_updates_activity(client):
    # Arrange
    email = "registered-student@example.com"
    activity_path = quote(ACTIVITY_NAME, safe="")
    app_module.activities[ACTIVITY_NAME]["participants"].append(email)

    # Act
    response = client.delete(
        f"/activities/{activity_path}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Removed {email} from {ACTIVITY_NAME}"}
    assert email not in app_module.activities[ACTIVITY_NAME]["participants"]


def test_remove_participant_returns_404_when_not_registered(client):
    # Arrange
    email = "unregistered-student@example.com"
    activity_path = quote(ACTIVITY_NAME, safe="")

    # Act
    response = client.delete(
        f"/activities/{activity_path}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"


def test_remove_participant_returns_404_for_unknown_activity(client):
    # Arrange
    activity_path = quote("Unknown Activity", safe="")

    # Act
    response = client.delete(
        f"/activities/{activity_path}/signup",
        params={"email": "student@example.com"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"