
import os
import json
import requests
import sys
from pathlib import Path

# Configuration
GUMROAD_API_URL = "https://api.gumroad.com/v2"
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_DIR = SCRIPT_DIR.parent
WORKSPACE_DIR = REPO_DIR.parent
IMPORT_FILE = str(REPO_DIR / "gumroad-products-import.json")
PACKAGED_DIR = WORKSPACE_DIR / "gumroad-products" / "packaged"

def load_products():
    with open(IMPORT_FILE, 'r') as f:
        return json.load(f)

def create_product(access_token, product_data):
    """Create a product on Gumroad via API"""
    url = f"{GUMROAD_API_URL}/products"
    
    payload = {
        "access_token": access_token,
        "name": product_data['name'],
        "price": product_data['price'], # In cents
        "description": "See full description below.", # Placeholder, update later
        "url": product_data.get('permalink'),
        "taxable": True,
        "currency": product_data.get('currency', 'USD')
    }
    
    print(f"Creating product: {product_data['name']}...")
    response = requests.post(url, data=payload)
    
    if response.status_code != 201:
        print(f"❌ Failed to create product: {response.text}")
        return None
        
    return response.json()['product']

def upload_file(access_token, product_id, zip_path):
    """Upload content to the product"""
    # Note: Gumroad API for file upload is complex/undocumented for public writing.
    # It usually requires creating a 'file' resource and associating it.
    # For this script, we will focus on CREATING the shell product.
    # You may need to manually drag-and-drop the ZIPs if API upload fails.
    print(f"⚠️  Skipping file upload for {zip_path} (API upload is restricted). Please upload manually in dashboard.")
    return True

def publish_product(access_token, product_id):
    """Publish the product"""
    url = f"{GUMROAD_API_URL}/products/{product_id}"
    payload = {
        "access_token": access_token,
        "published": "true"
    }
    response = requests.put(url, data=payload)
    return response.status_code == 200

def resolve_zip_path(product):
    """Resolve the ZIP path for a product, preferring explicit paths then packaged zips."""
    zip_file = product.get("zip_file")
    if zip_file:
        path = Path(zip_file)
        if not path.is_absolute():
            path = REPO_DIR / path
        if path.exists():
            return path

    sku = product.get("sku")
    if sku and PACKAGED_DIR.exists():
        candidates = sorted(PACKAGED_DIR.glob(f"{sku}*.zip"))
        if candidates:
            return candidates[0]

    return None


def main():
    print("🚀 BrainOps Gumroad Publisher")
    print("=============================")
    
    # 1. Get Access Token
    access_token = os.getenv("GUMROAD_ACCESS_TOKEN")
    if not access_token:
        print("❌ Error: GUMROAD_ACCESS_TOKEN environment variable not set.")
        print("Please run: export GUMROAD_ACCESS_TOKEN='your_token_here'")
        sys.exit(1)
        
    # 2. Load Data
    try:
        data = load_products()
        products = data['products']
        print(f"📦 Loaded {len(products)} products from {IMPORT_FILE}")
    except Exception as e:
        print(f"❌ Failed to load import file: {e}")
        sys.exit(1)
        
    # 3. Process
    for p in products:
        zip_path = resolve_zip_path(p)
        if not zip_path:
            print(f"⚠️  Warning: ZIP file not found for SKU {p.get('sku')}")
            # Continue anyway to create the product shell
            
        gumroad_prod = create_product(access_token, p)
        if gumroad_prod:
            pid = gumroad_prod['id']
            print(f"   ✅ Created Product ID: {pid}")
            print(f"   🔗 Edit URL: https://gumroad.com/products/{pid}/edit")
            
            # Publish
            if publish_product(access_token, pid):
                print("   ✅ Published!")
            else:
                print("   ⚠️  Failed to publish (do it manually).")
                
        print("---")

if __name__ == "__main__":
    main()
