#!/usr/bin/env python3

import http.client
import json

ENDPOINT = "localhost"
PORT = 3000


def json_request(method: str, path: str, data: dict | None = None):
    conn = http.client.HTTPConnection(ENDPOINT, PORT)

    headers = {"Content-Type": "application/json"}
    body = json.dumps(data) if data else None

    try:
        conn.request(method, path, body, headers)
        response = conn.getresponse()
        if response.status < 200 or response.status >= 300:
            raise Exception(
                f"Status code {response.status} isn't 200 range: "
                + f"{response.read().decode()}"
            )

        return json.loads(response.read().decode())

    except Exception as e:
        print(f"Error with {method} request to {path}: {e}")
        exit(1)

    finally:
        conn.close()


# pull dummy game data from the json file

try:
    with open("scripts/dummy_game_data.json", "r") as f:
        dummy_game_data = json.load(f)
except FileNotFoundError:
    try:
        with open("dummy_game_data.json", "r") as f:
            dummy_game_data = json.load(f)
    except FileNotFoundError:
        print(
            "Couldn't find 'dummy_game_data.json' in the current directory or "
            + "the 'scripts' directory."
        )
        exit(1)
all_player_data = dummy_game_data["players"]
ratings = dummy_game_data["ratings"]

# create a game

print("Creating game...")
response = json_request(
    "POST",
    "/game/new",
    {
        "game_name": "Dummy Game",
        "game_description": "This is a test playlist rating game!",
        "min_songs_per_playlist": 15,
        "max_songs_per_playlist": 15,
        "require_playlist_link": False,
    },
)
admin_code = response["admin_code"]
invite_code = response["invite_code"]
print(f"Game created, admin code: {admin_code}, invite code: {invite_code}.")

# add all players to the game

player_codes = {}
print(f"Adding {len(all_player_data)} players...")
for i, player_data in enumerate(all_player_data):
    response = json_request("POST", f"/game/join/{invite_code}", player_data)
    player_codes[player_data["player_name"]] = response["player_code"]
print(f"{len(all_player_data)} players added.")

# begin game

print("Beginning game...")
json_request("POST", f"/admin/begin/{admin_code}")
print(f"Game begun.")

# get a list of all songs

print("Getting a list of all songs...")
songs = json_request("GET", f"/admin/review/{admin_code}")["songs"]
print(f"Retrieved {len(songs)} songs.")

# submit all ratings

print("Submitting all ratings...")
for i, ((player_name, player_code), player_ratings) in enumerate(
    zip(player_codes.items(), ratings)
):
    for song, rating in zip(songs, player_ratings):
        if rating is None:
            continue
        # song_id
        json_request(
            "POST",
            f"/player/rate_song/{player_code}",
            {"song_id": song["song_id"], "rating": rating},
        )
    print(f"Ratings submitted for {player_name} ({i + 1}/{len(player_codes)}).")
print("All ratings submitted.")

print(f"\nReview game: https://localhost/admin?admin_code={admin_code}")
