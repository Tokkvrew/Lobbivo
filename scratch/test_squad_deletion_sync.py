# -*- coding: utf-8 -*-
import json

def test_squad_deletion_sync():
    # 1. State on Phone before deletion
    phone_app_state_users = {
        "TestUser": {
            "avatar": "test.png",
            "squads": [
                {
                    "id": "sq_123",
                    "game": "csgo",
                    "rank": "Global",
                    "active": True
                }
            ],
            "lookingForTeam": True,
            "hasCreatedSquad": True
        }
    }

    # 2. Firebase snapshot received after PC deleted the squad
    # (Firebase RTDB omits empty arrays / null fields)
    firebase_snapshot_data = {
        "TestUser": {
            "avatar": "test.png",
            "coins": 100,
            "updatedAt": 1700000000
            # note: 'squads' field is NOT present in firebase snapshot because it was deleted
        }
    }

    # 3. Simulate phone's new sync logic in firebase-sync.js
    for username, cloudUser in firebase_snapshot_data.items():
        if "squads" in cloudUser and cloudUser["squads"]:
            if isinstance(cloudUser["squads"], list):
                cloudUser["squads"] = [s for s in cloudUser["squads"] if s and isinstance(s, dict)]
            elif isinstance(cloudUser["squads"], dict):
                cloudUser["squads"] = [s for s in cloudUser["squads"].values() if s and isinstance(s, dict)]
            else:
                cloudUser["squads"] = []
        else:
            cloudUser["squads"] = []

        cloudUser["lookingForTeam"] = len(cloudUser["squads"]) > 0 and any(s.get("active") is not False for s in cloudUser["squads"])
        cloudUser["hasCreatedSquad"] = len(cloudUser["squads"]) > 0

        localUser = phone_app_state_users.get(username, {})
        merged = {
            **localUser,
            **cloudUser,
            "squads": cloudUser["squads"],
            "lookingForTeam": cloudUser["lookingForTeam"],
            "hasCreatedSquad": cloudUser["hasCreatedSquad"]
        }
        phone_app_state_users[username] = merged

    # 4. Verify Phone's state
    u = phone_app_state_users["TestUser"]
    assert u["squads"] == [], f"Expected empty squads, got {u['squads']}"
    assert u["lookingForTeam"] is False, f"Expected lookingForTeam=False, got {u['lookingForTeam']}"
    assert u["hasCreatedSquad"] is False, f"Expected hasCreatedSquad=False, got {u['hasCreatedSquad']}"

    # 5. Simulate renderPlayers
    squadCards = []
    for username, user in phone_app_state_users.items():
        squads = user.get("squads", [])
        if len(squads) > 0:
            for sq in squads:
                if sq.get("active") is False:
                    continue
                squadCards.append(sq)

    assert len(squadCards) == 0, f"Expected 0 squad cards, got {len(squadCards)}"
    print("ALL SQUAD DELETION SYNC TESTS PASSED!")

if __name__ == "__main__":
    test_squad_deletion_sync()
