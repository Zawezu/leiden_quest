import os
import re
import pandas as pd
from rapidfuzz import fuzz, process

# -------------------------
# CONFIGURATION
# -------------------------
CSV_PATH = "poems_geocoded.csv"
IMAGES_FOLDER = "static/poem_images"   # folder containing the images
OUTPUT_EXTENSION = ".jpeg" # desired output extension
# -------------------------


def clean_text(s: str) -> str:
    """Normalize text for better fuzzy matching."""
    s = re.sub(r"[^a-zA-Z0-9 ]", " ", s).lower().strip()
    s = re.sub(r"leiden", "", s)
    s = re.sub(r"wall ?poem", "", s)
    return s


def parse_filename(filename: str):
    """
    Extract author + poem name from filenames like:
    "...px-author_name-name-some_stuff.jpeg"
    """
    name = os.path.splitext(filename)[0]

    # remove everything before the first hyphen after a px- prefix
    # e.g. "450px-charles-baudelaire-linvitation.jpeg"
    name = re.sub(r"^\d*px-", "", name)
    name = re.sub(r"_"," ", name)

    # split by hyphens
    parts = name.split("-")
    # print(f"Parts: {parts}")

    # heuristic: assume first part(s) → author, next part(s) → poem title
    # We take first two parts as author (common in multi-word names),
    # next one or two parts as title candidates.

    if len(parts) >= 2:
        if clean_text(parts[0]) != "anoniem":
            author_guess = parts[0]
            title_guess = parts[1]
        else:
            author_guess = ""
            title_guess = parts[1]
    else:
        author_guess = parts[0]
        title_guess = ""


    return clean_text(author_guess), clean_text(title_guess)


def best_match(author, title, df):
    """
    Fuzzy-match a filename to the best CSV row using both author and poem title.
    """
    best_score = -1
    best_row = None

    for _, row in df.iterrows():
        row_author = clean_text(str(row["author"]))
        row_title = clean_text(str(row["original_title"]))

        # Combined fuzzy score (tweak weights if desired)
        score = (
            0.6 * fuzz.partial_ratio(author, row_author) +
            0.4 * fuzz.token_sort_ratio(title, row_title)
        )

        if score > best_score:
            best_score = score
            best_row = row

    return best_row, best_score


df = pd.read_csv(CSV_PATH, sep=";")  # your CSV uses semicolons
df["author_clean"] = df["author"].astype(str).apply(clean_text)
df["title_clean"] = df["original_title"].astype(str).apply(clean_text)

guesses_dict = {}

for filename in os.listdir(IMAGES_FOLDER):
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        continue

    old_path = os.path.join(IMAGES_FOLDER, filename)

    file_author, file_title = parse_filename(filename)

    print(f"Matching {file_author, file_title}")
    match_row, score = best_match(file_author, file_title, df)

    if match_row is None:
        print(f"Could not match: {filename}")
        continue

    poem_id = match_row["id"]

    new_filename = f"{poem_id}{OUTPUT_EXTENSION}"
    new_path = os.path.join(IMAGES_FOLDER, new_filename)

    print(f"{new_filename} (score={score:.1f})")

    try:
        guesses_dict[poem_id].append((file_author, file_title))
        print("Repeated guess!")
    except KeyError:
        guesses_dict[poem_id] = [(file_author, file_title)]
        os.rename(old_path, new_path)

for id, guesses in guesses_dict.items():
    if len(guesses) > 1:
        print(guesses)


print("\nDone!")