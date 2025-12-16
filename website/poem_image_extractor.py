import os
import requests
import json
from urllib.parse import quote

PAGE_TITLE = "Lijst_van_muurgedichten_in_Leiden"
SAVE_FOLDER = "website/static/poem_images_raw"

os.makedirs(SAVE_FOLDER, exist_ok=True)

HEADERS = {
    "User-Agent": "LeidenPoemsImageDownloader/1.0 (nicolas.ramos.fernandez@gmail.com)"
}

# Step 1: Get page content + list of images
print("Fetching image list...")

images_url = (
    "https://nl.wikipedia.org/w/api.php"
    "?action=parse"
    f"&page={quote(PAGE_TITLE)}"
    "&prop=images"
    "&format=json"
)

response = requests.get(images_url, headers=HEADERS)
if response.status_code != 200:
    print("Error fetching image list:", response.text)
    exit(1)

images_data = response.json()
image_files = images_data["parse"]["images"]

print(f"Found {len(image_files)} images on the page.")

# Step 2: Get full-resolution URL for each image
def get_fullres_url(filename):
    api_url = (
        "https://nl.wikipedia.org/w/api.php"
        "?action=query"
        "&format=json"
        "&prop=imageinfo"
        "&iiprop=url"
        f"&titles=File:{quote(filename)}"
    )
    r = requests.get(api_url, headers=HEADERS)
    if r.status_code != 200:
        print("  Error:", r.text)
        return None

    data = r.json()
    pages = data["query"]["pages"]
    for _, page in pages.items():
        if "imageinfo" in page:
            return page["imageinfo"][0]["url"]
    return None

i=1
# Step 3: Download each image
for filename in image_files:
    print(f"\nProcessing: {filename}")
    extension = filename.split(".")[-1]
    print(extension)
    if extension == "svg" or extension == "webp": # We do not want the svg or webp images
        continue

    full_url = get_fullres_url(filename)
    if not full_url:
        print("  ❌ Could not retrieve full-resolution URL.")
        continue

    img_data = requests.get(full_url, headers=HEADERS).content

    local_name = str(i) + "_" + filename.replace(" ", "_")
    save_path = os.path.join(SAVE_FOLDER, local_name)

    with open(save_path, "wb") as f:
        f.write(img_data)

    print(f"  ✔ Saved: {save_path}")

    i += 1

print("\nDone! All available images have been downloaded.")