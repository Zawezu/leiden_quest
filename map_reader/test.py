import pandas as pd

df = pd.read_csv("poems.csv", sep=";", index_col=0)  # assumes column "address"

# print(df)

# print(df.columns)
# for row
# print(df.loc[1, "address"])

for i, row in df.iterrows():
    if type(row["address_detail"]) == str:
        # print(row["address_detail"])
        address = row["address"]+row["address_detail"]
    else:
        address = row["address"]
    print(address)
#
