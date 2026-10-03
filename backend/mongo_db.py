import hashlib
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
materials = client["studymate"]["materials"]
materials.create_index([("pdf_hash", 1), ("kind", 1)], unique=True)

def pdf_key(file):
    data = file.read()
    file.seek(0)
    return hashlib.md5(data).hexdigest()

def get_cached(pdf_hash, kind):
    try:
        doc = materials.find_one({"pdf_hash": pdf_hash, "kind": kind})
        return doc["result"] if doc else None
    except Exception:
        return None

def save_cached(pdf_hash, kind, result, filename=""):
    try:
        materials.update_one(
            {"pdf_hash": pdf_hash, "kind": kind},
            {"$set": {"result": result, "filename": filename}},
            upsert=True,
        )
    except Exception as e:
        print("Mongo save error:", e)

if __name__ == "__main__":
    client.admin.command("ping")
    print("MongoDB connected successfully!")