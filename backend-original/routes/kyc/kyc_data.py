import pycountry

default_docs = ["National ID","Passport", "Driver's License", "Other ID"]

# ✅ Define only 5 allowed countries (ISO Alpha-2 codes)
ALLOWED_COUNTRIES = ["BD", "IN", "PK", "NP"]

def generate_doc_types():
    """
    Generate a dictionary of only 5 selected countries mapped to:
      - country code
      - country name
      - flag icon (emoji)
      - available document types
    Philippines only includes Passport.
    """
    def country_flag(alpha_2):
        # Convert country code to flag emoji
        return chr(127397 + ord(alpha_2[0])) + chr(127397 + ord(alpha_2[1]))

    doc_types = {}
    for country in pycountry.countries:
        if country.alpha_2 in ALLOWED_COUNTRIES:
            doc_types[country.alpha_2] = {
                "code": country.alpha_2,
                "name": country.name,
                "icon": country_flag(country.alpha_2),
                "docs": default_docs[:]
            }

    # Special rule for Philippines
    if "PH" in doc_types:
        doc_types["PH"]["docs"] = ["Passport"]

    return doc_types
