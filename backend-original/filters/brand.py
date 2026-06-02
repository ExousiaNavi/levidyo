# backend/brand.py
brand_currency_map = {
    "bj": ["BDT", "PKR", "INR"],
    "jb": ["BDT", "INR", "PKR"],
    "s6": ["BDT", "INR", "PKR"],
}

def get_all_brands():
    return ["bj", "jb", 's6']

def get_supported_currencies(brand: str):
    return {
        "bj": ["BDT", "PKR", "INR"],
        "jb": ["BDT", "INR", "PKR"],
        "s6": ["BDT", "INR", "PKR"],
    }.get(brand, [])

def get_default_currency(brand: str):
    return get_supported_currencies(brand)[0] if get_supported_currencies(brand) else "BDT"

