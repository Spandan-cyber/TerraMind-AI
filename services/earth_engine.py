import ee
from services.gee_auth import initialize as gee_initialize

# Ensure Earth Engine is initialized
try:
    gee_initialize()
except Exception as _e:
    print("[WARN] Earth Engine auto-init notice:", _e)




# ==========================================================
# CONVERT GEOJSON TO EE GEOMETRY
# ==========================================================

def geojson_to_ee(geojson):

    coords = geojson["geometry"]["coordinates"]

    return ee.Geometry.Polygon(coords)


# ==========================================================
# GET LATEST CLOUD FREE SENTINEL IMAGE
# ==========================================================

def get_latest_image(farm):

    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(farm)
        .filterDate("2024-01-01", "2030-01-01")
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
        .sort("system:time_start", False)
    )

    return collection.first()


# ==========================================================
# NDVI
# ==========================================================

def calculate_ndvi(image):

    return image.normalizedDifference(
        ["B8", "B4"]
    ).rename("NDVI")


# ==========================================================
# IMAGE METADATA
# ==========================================================

def get_capture_date(image):

    return (
        ee.Date(image.get("system:time_start"))
        .format("YYYY-MM-dd")
        .getInfo()
    )


def get_cloud_cover(image):

    return image.get(
        "CLOUDY_PIXEL_PERCENTAGE"
    ).getInfo()


# ==========================================================
# FARM AREA
# ==========================================================

def get_area_hectares(farm):

    area = farm.area().divide(10000)

    return round(area.getInfo(), 2)


# ==========================================================
# NDVI STATISTICS
# ==========================================================

def get_ndvi_statistics(ndvi, farm):

    stats = ndvi.reduceRegion(

        reducer=ee.Reducer.mean()
                .combine(
                    reducer2=ee.Reducer.min(),
                    sharedInputs=True
                )
                .combine(
                    reducer2=ee.Reducer.max(),
                    sharedInputs=True
                ),

        geometry=farm,

        scale=10,

        maxPixels=1e9

    ).getInfo()

    return {

        "mean": stats.get("NDVI_mean", 0),

        "min": stats.get("NDVI_min", 0),

        "max": stats.get("NDVI_max", 0)

    }
