def generate_advice(ndvi):

    if ndvi >= 0.70:
        return [
            "Crop health is excellent.",
            "Continue current irrigation schedule.",
            "No immediate action required."
        ]

    elif ndvi >= 0.50:
        return [
            "Crop growth is moderate.",
            "Check irrigation.",
            "Monitor nutrient levels."
        ]

    elif ndvi >= 0.30:
        return [
            "Possible nutrient deficiency.",
            "Inspect crop for pests.",
            "Increase monitoring."
        ]

    else:
        return [
            "Crop under severe stress.",
            "Inspect field immediately.",
            "Consider irrigation and fertilizer."
        ]