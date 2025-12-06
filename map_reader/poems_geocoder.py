import pandas as pd
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import time

# Load your CSV
df = pd.read_csv("map_reader/static/poems_raw.csv", sep=";", index_col=0)  # assumes column "address"

# Initialize geocoder
geolocator = Nominatim(user_agent="leiden_poems_map")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.5)  # respect usage limits

# Create columns for lat/lon
df["latitude"] = None
df["longitude"] = None


# Geocode each address
for i, row in df.iterrows():
    try:
        if row["address_detail"] != "EMPTY":
            address = f"{row['address']} {row['address_detail']}"
        else:
            address = row["address"]
        # print(address)
        location = geocode(address)
        # print(location)
        if location:
            print((location.latitude, location.latitude))
            df.at[i, "latitude"] = location.latitude
            df.at[i, "longitude"] = location.longitude
        else:
            print(f"Could not geocode: {address}")
            if row["address_detail"] != "EMPTY":
                address = row["address"]
                location = geocode(address)
                # print(location)
                if location:
                    print((location.latitude, location.latitude))
                    df.at[i, "latitude"] = location.latitude
                    df.at[i, "longitude"] = location.longitude
                else:
                    print(f"Could not geocode: {address} simplified")
    except Exception as e:
        print(f"Error geocoding {address}: {e}")
    time.sleep(1.2)  # be polite to the server

# Save results
df.to_csv("map_reader/static/poems_geocoded.csv", sep=";")
print("Geocoding complete!")