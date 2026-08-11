"""
=============================================================
TerraMind Satellite Engine v2
-------------------------------------------------------------
Google Earth Engine Backend

Features
--------
✓ Dynamic Sentinel-2 Search
✓ Cloud Masking
✓ Composite Generation
✓ Vegetation Indices
✓ Statistics
✓ Crop Health
✓ RGB Visualization
✓ NDVI Visualization
✓ Historical Analysis
✓ Future Weather Integration

Author : TerraMind
Version: 2.0
=============================================================
"""

import os
import concurrent.futures
from datetime import datetime, timedelta
from services.gee_auth import initialize as gee_initialize

import ee

from services.weather_service import get_weather



class SatelliteEngine:
    """
    TerraMind Satellite Processing Engine
    """

    # ---------------------------------------------------------
    # CONFIGURATION
    # ---------------------------------------------------------

    COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"

    SEARCH_WINDOWS = [
        15,
        30,
        60,
        90
    ]

    CLOUD_LIMIT = 20

    SCALE = 10

    PROJECT = os.getenv("EE_PROJECT", "terramind-504413")

    INITIALIZED = False

    # ---------------------------------------------------------
    # INITIALIZE EARTH ENGINE
    # ---------------------------------------------------------

    @classmethod
    def initialize(cls):

        if cls.INITIALIZED:
            return

        gee_initialize()

        cls.INITIALIZED = True

    # ---------------------------------------------------------
    # GEOJSON → EE GEOMETRY
    # ---------------------------------------------------------

    @classmethod
    def geojson_to_geometry(cls, geojson):

        cls.initialize()

        try:

            if isinstance(geojson, dict) and "geometry" in geojson:
                coords = geojson["geometry"]["coordinates"]
            elif isinstance(geojson, dict) and "coordinates" in geojson:
                coords = geojson["coordinates"]
            else:
                coords = geojson

            return ee.Geometry.Polygon(coords)

        except Exception as e:

            raise Exception(
                f"Invalid farm polygon: {e}"
            )

    # ---------------------------------------------------------
    # FARM INFORMATION
    # ---------------------------------------------------------

    @classmethod
    def farm_information(cls, geometry):
        """
        Area, perimeter and centroid.
        """

        area = geometry.area().divide(10000)

        perimeter = geometry.perimeter()

        centroid = geometry.centroid()

        center = centroid.coordinates().getInfo()

        return {

            "area_hectares":
                round(area.getInfo(), 2),

            "perimeter_m":
                round(perimeter.getInfo(), 2),

            "centroid":
                center

        }

    # ---------------------------------------------------------
    # CLOUD MASK
    # ---------------------------------------------------------

    @classmethod
    def mask_clouds(cls, image):
        """
        Sentinel-2 QA60 cloud masking.
        """

        qa = image.select("QA60")

        cloud = 1 << 10

        cirrus = 1 << 11

        mask = (

            qa.bitwiseAnd(cloud).eq(0)

            .And(

                qa.bitwiseAnd(cirrus).eq(0)

            )

        )

        return (

            image.updateMask(mask)

            .divide(10000)

            .copyProperties(

                image,

                ["system:time_start", "CLOUDY_PIXEL_PERCENTAGE"]

            )

        )

    # ---------------------------------------------------------
    # IMAGE SEARCH
    # ---------------------------------------------------------

    @classmethod
    def search_collection(cls, geometry):
        """
        Search latest imagery.

        Automatically expands the search window.

        15 → 30 → 60 → 90 Days
        """

        today = datetime.utcnow()

        for days in cls.SEARCH_WINDOWS:

            start = (

                today -

                timedelta(days=days)

            ).strftime("%Y-%m-%d")

            end = today.strftime("%Y-%m-%d")

            collection = (

                ee.ImageCollection(

                    cls.COLLECTION

                )

                .filterBounds(geometry)

                .filterDate(start, end)

                .filter(

                    ee.Filter.lt(

                        "CLOUDY_PIXEL_PERCENTAGE",

                        cls.CLOUD_LIMIT

                    )

                )

                .map(cls.mask_clouds)

            )

            if collection.size().getInfo() > 0:

                print(

                    f"[OK] Found imagery within last {days} days."

                )

                return collection, days

        raise Exception(

            "No Sentinel-2 imagery available "

            "within the last 90 days."

        )

    # ---------------------------------------------------------
    # CREATE COMPOSITE
    # ---------------------------------------------------------

    @classmethod
    def create_composite(cls, collection):
        """
        Median composite.
        """

        return collection.median()
    # =========================================================
    # VEGETATION INDICES
    # =========================================================

    @classmethod
    def calculate_indices(cls, image):
        """
        Calculate vegetation indices from the
        Sentinel-2 composite.
        """

        # ---------------------------
        # NDVI
        # ---------------------------

        ndvi = image.normalizedDifference(
            ["B8", "B4"]
        ).rename("NDVI")

        # ---------------------------
        # NDWI
        # ---------------------------

        ndwi = image.normalizedDifference(
            ["B3", "B8"]
        ).rename("NDWI")

        # ---------------------------
        # NDMI
        # ---------------------------

        ndmi = image.normalizedDifference(
            ["B8", "B11"]
        ).rename("NDMI")

        # ---------------------------
        # SAVI
        # ---------------------------

        savi = image.expression(

            "((NIR-RED)/(NIR+RED+L))*(1+L)",

            {
                "NIR": image.select("B8"),
                "RED": image.select("B4"),
                "L": 0.5
            }

        ).rename("SAVI")

        # ---------------------------
        # EVI
        # ---------------------------

        evi = image.expression(

            "2.5*((NIR-RED)/(NIR+6*RED-7.5*BLUE+1))",

            {
                "NIR": image.select("B8"),
                "RED": image.select("B4"),
                "BLUE": image.select("B2")
            }

        ).rename("EVI")

        return {

            "NDVI": ndvi,

            "NDWI": ndwi,

            "NDMI": ndmi,

            "SAVI": savi,

            "EVI": evi

        }

    # =========================================================
    # INDEX STATISTICS
    # =========================================================

    @classmethod
    def index_statistics(cls, image, geometry):
        """
        Calculate statistics for one vegetation index.
        """

        stats = image.reduceRegion(

            reducer=(
                ee.Reducer.mean()
                .combine(
                    reducer2=ee.Reducer.min(),
                    sharedInputs=True
                )
                .combine(
                    reducer2=ee.Reducer.max(),
                    sharedInputs=True
                )
                .combine(
                    reducer2=ee.Reducer.stdDev(),
                    sharedInputs=True
                )
            ),

            geometry=geometry,

            scale=cls.SCALE,

            maxPixels=1e10

        ).getInfo()

        if not stats:

            return {

                "mean": 0,

                "min": 0,

                "max": 0,

                "std": 0

            }

        band = list(stats.keys())[0].split("_")[0]

        def safe_value(key):
            value = stats.get(key)
            return round(float(value), 4) if value is not None else 0

        return {

            "mean": safe_value(f"{band}_mean"),

            "min": safe_value(f"{band}_min"),

            "max": safe_value(f"{band}_max"),

            "std": safe_value(f"{band}_stdDev")

        }

    # =========================================================
    # ALL INDICES
    # =========================================================

    @classmethod
    def calculate_statistics(
        cls,
        indices,
        geometry
    ):
        """
        Calculate statistics for all indices.

        Runs the 5 reduceRegion calls concurrently instead of
        one after another — this alone cuts a big chunk off
        total analysis time, since each one is a separate
        blocking round trip to Earth Engine.
        """

        results = {}

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:

            futures = {
                name: executor.submit(cls.index_statistics, img, geometry)
                for name, img in indices.items()
            }

            for name, future in futures.items():
                results[name] = future.result()

        return results
        # =========================================================
    # CROP HEALTH CLASSIFICATION
    # =========================================================

    @classmethod
    def classify_crop_health(cls, ndvi):
        """
        Classify NDVI into three vegetation classes.

        Healthy   : NDVI >= 0.70
        Moderate  : 0.40 <= NDVI < 0.70
        Poor      : NDVI < 0.40
        """

        healthy = ndvi.gte(0.70).rename("healthy")

        moderate = (
            ndvi.gte(0.40)
            .And(ndvi.lt(0.70))
            .rename("moderate")
        )

        poor = ndvi.lt(0.40).rename("poor")

        return {
            "healthy": healthy,
            "moderate": moderate,
            "poor": poor
        }

    # =========================================================
    # PIXEL COUNT
    # =========================================================

    @classmethod
    def pixel_count(cls, image, geometry):

        value = image.reduceRegion(

            reducer=ee.Reducer.sum(),

            geometry=geometry,

            scale=cls.SCALE,

            maxPixels=1e10

        ).values().get(0)

        return ee.Number(
            ee.Algorithms.If(value, value, 0)
        )

    # =========================================================
    # CLASSIFICATION STATISTICS
    # =========================================================

    @classmethod
    def crop_health_statistics(
        cls,
        classified,
        geometry
    ):
        """
        Calculate percentage of Healthy,
        Moderate and Poor vegetation.
        """

        healthy = cls.pixel_count(
            classified["healthy"],
            geometry
        )

        moderate = cls.pixel_count(
            classified["moderate"],
            geometry
        )

        poor = cls.pixel_count(
            classified["poor"],
            geometry
        )

        total = healthy.add(moderate).add(poor)

        if total.getInfo() == 0:

            return {

                "healthy": 0,

                "moderate": 0,

                "poor": 0

            }

        return {

            "healthy": round(
                healthy.divide(total)
                .multiply(100)
                .getInfo(),
                2
            ),

            "moderate": round(
                moderate.divide(total)
                .multiply(100)
                .getInfo(),
                2
            ),

            "poor": round(
                poor.divide(total)
                .multiply(100)
                .getInfo(),
                2
            )

        }

    # =========================================================
    # IMAGE METADATA
    # =========================================================

    @classmethod
    def image_metadata(cls, image):

        time_start = image.get("system:time_start").getInfo()

        cloud_cover = image.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()

        return {

            "capture_date": (
                ee.Date(time_start).format("YYYY-MM-dd").getInfo()
                if time_start is not None else "Unknown"
            ),

            "cloud_cover": (
                round(cloud_cover, 2) if cloud_cover is not None else 0
            )

        }

    # =========================================================
    # IMAGE QUALITY SCORE
    # =========================================================

    @classmethod
    def quality_score(
        cls,
        image_age,
        cloud_cover,
        image_count
    ):
        """
        Compute a quality score (0-100)
        based on freshness, cloud cover,
        and number of images in the composite.
        """

        score = 100

        # -----------------------
        # Image freshness
        # -----------------------

        if image_age > 15:
            score -= 10

        if image_age > 30:
            score -= 15

        if image_age > 60:
            score -= 25

        # -----------------------
        # Cloud penalty
        # -----------------------

        score -= cloud_cover * 0.5

        # -----------------------
        # Composite bonus
        # -----------------------

        if image_count >= 5:

            score += 5

        elif image_count == 1:

            score -= 10

        score = max(
            0,
            min(
                100,
                score
            )
        )

        if score >= 90:

            quality = "Excellent"

        elif score >= 75:

            quality = "Good"

        elif score >= 60:

            quality = "Moderate"

        else:

            quality = "Poor"

        return {

            "score": round(score, 1),

            "quality": quality

        }

    # =========================================================
    # IMAGE FRESHNESS
    # =========================================================

    @classmethod
    def freshness(cls, image_age):

        if image_age <= 15:
            return "Fresh"

        elif image_age <= 30:
            return "Recent"

        elif image_age <= 60:
            return "Old"

        return "Very Old"

        # =========================================================
    # RGB VISUALIZATION
    # =========================================================

    @classmethod
    def rgb_visualization(cls, image):
        """
        Natural colour RGB visualization.
        """

        return image.visualize(

            bands=["B4", "B3", "B2"],

            min=0.02,

            max=0.30,

            gamma=1.15

        )

    # =========================================================
    # NDVI VISUALIZATION
    # =========================================================

    @classmethod
    def ndvi_visualization(cls, ndvi):
        """
        Colorized NDVI visualization.
        """

        return ndvi.visualize(

            min=0,

            max=1,

            palette=[

                "#8B0000",
                "#FF4500",
                "#FFA500",
                "#FFFF00",
                "#ADFF2F",
                "#228B22",
                "#006400"

            ]

        )

    # =========================================================
    # NDWI VISUALIZATION
    # =========================================================

    @classmethod
    def ndwi_visualization(cls, ndwi):

        return ndwi.visualize(

            min=-0.5,

            max=0.5,

            palette=[

                "#7F3B08",
                "#FDD49E",
                "#FFFFBF",
                "#ABD9E9",
                "#2C7BB6"

            ]

        )

    # =========================================================
    # GENERATE THUMBNAIL URL
    # =========================================================

    @classmethod
    def thumbnail(cls, image, geometry):
        """
        Returns a PNG thumbnail URL.
        """

        return image.getThumbURL({

            "region": geometry,

            "dimensions": 900,

            "format": "png"

        })

    # =========================================================
    # VISUALIZATION PACKAGE
    # =========================================================

    @classmethod
    def create_visualizations(
        cls,
        composite,
        indices,
        geometry
    ):
        """
        Create all visualization URLs.
        """

        rgb = cls.rgb_visualization(composite)

        ndvi = cls.ndvi_visualization(
            indices["NDVI"]
        )

        ndwi = cls.ndwi_visualization(
            indices["NDWI"]
        )

        return {

            "rgb":

                cls.thumbnail(
                    rgb,
                    geometry
                ),

            "ndvi":

                cls.thumbnail(
                    ndvi,
                    geometry
                ),

            "ndwi":

                cls.thumbnail(
                    ndwi,
                    geometry
                )

        }

    # =========================================================
    # NDVI HISTOGRAM
    # =========================================================

    @classmethod
    def ndvi_histogram(cls, ndvi, geometry):
        """
        Returns histogram data for NDVI.
        """

        try:

            histogram = (

                ndvi.reduceRegion(

                    reducer=ee.Reducer.histogram(25),

                    geometry=geometry,

                    scale=cls.SCALE,

                    maxPixels=1e10

                )

                .getInfo()

            )

            return histogram

        except Exception:

            return {}

    # =========================================================
    # IMAGE INFORMATION
    # =========================================================

    @classmethod
    def image_information(
        cls,
        collection,
        image_age
    ):
        """
        Information about the latest image.
        """

        latest = collection.first()

        metadata = cls.image_metadata(latest)

        image_count = collection.size().getInfo()

        quality = cls.quality_score(

            image_age,

            metadata["cloud_cover"],

            image_count

        )

        return {

            "capture_date":

                metadata["capture_date"],

            "cloud_cover":

                metadata["cloud_cover"],

            "image_age_days":

                image_age,

            "freshness":

                cls.freshness(image_age),

            "images_used":

                image_count,

            "quality":

                quality

        }

        # =========================================================
    # HISTORICAL ANALYSIS
    # =========================================================

    @classmethod
    def historical_analysis(
        cls,
        geometry,
        start_date=None,
        end_date=None,
        samples=6
    ):
        """
        Builds an NDVI timeline between start_date and end_date
        (both "YYYY-MM-DD" strings). Defaults to the last 180 days
        if no range is given.

        Samples `samples` evenly-spaced points across the range
        and runs them CONCURRENTLY (each is an independent Earth
        Engine round trip) instead of one after another — this is
        the other big chunk of the original 2-minute wait.
        """

        today = datetime.utcnow()

        end = (
            datetime.strptime(end_date, "%Y-%m-%d")
            if end_date else today
        )

        start = (
            datetime.strptime(start_date, "%Y-%m-%d")
            if start_date else end - timedelta(days=180)
        )

        total_days = (end - start).days

        if total_days <= 0:
            return []

        step = max(total_days // max(samples - 1, 1), 1)

        sample_points = sorted({
            end - timedelta(days=i * step)
            for i in range(samples)
            if (end - timedelta(days=i * step)) >= start
        }, reverse=True)

        def process_point(point_end):

            point_start = point_end - timedelta(days=10)

            collection = (

                ee.ImageCollection(cls.COLLECTION)

                .filterBounds(geometry)

                .filterDate(
                    point_start.strftime("%Y-%m-%d"),
                    point_end.strftime("%Y-%m-%d")
                )

                .filter(
                    ee.Filter.lt(
                        "CLOUDY_PIXEL_PERCENTAGE",
                        cls.CLOUD_LIMIT
                    )
                )

                .map(cls.mask_clouds)

            )

            if collection.size().getInfo() == 0:
                return None

            composite = cls.create_composite(collection)

            indices = cls.calculate_indices(composite)

            stats = cls.index_statistics(
                indices["NDVI"],
                geometry
            )

            ndvi = stats["mean"]

            if ndvi >= 0.70:
                quality = "Excellent"
            elif ndvi >= 0.55:
                quality = "Good"
            elif ndvi >= 0.40:
                quality = "Moderate"
            else:
                quality = "Poor"

            return {
                "date": point_end.strftime("%Y-%m-%d"),
                "ndvi": ndvi,
                "quality": quality
            }

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:

            results = list(executor.map(process_point, sample_points))

        # Most recent first, drop periods with no imagery

        history = [r for r in results if r is not None]

        history.sort(key=lambda r: r["date"], reverse=True)

        return history

    # =========================================================
    # NDVI TREND
    # =========================================================

    @classmethod
    def vegetation_trend(cls, history):
        """
        Detect vegetation trend.
        """

        if len(history) < 2:

            return {

                "trend":"Unknown",

                "change":0

            }

        latest = history[0]["ndvi"]

        oldest = history[-1]["ndvi"]

        diff = round(

            latest-oldest,

            3

        )

        if diff > 0.05:

            trend="Improving"

        elif diff < -0.05:

            trend="Declining"

        else:

            trend="Stable"

        return {

            "trend":trend,

            "change":diff

        }

    # =========================================================
    # AI INSIGHTS
    # =========================================================

    @classmethod
    def ai_insights(
        cls,
        indices,
        crop_health,
        history,
        weather=None
    ):
        """
        Simple rule-based advisory.
        """

        advice=[]

        ndvi=indices["NDVI"]["mean"]

        ndwi=indices["NDWI"]["mean"]

        ndmi=indices["NDMI"]["mean"]

        trend=cls.vegetation_trend(history)

        # Vegetation

        if ndvi>0.75:

            advice.append({

                "title":"Excellent Vegetation",

                "level":"success",

                "message":"Crop vigor is excellent."

            })

        elif ndvi>0.55:

            advice.append({

                "title":"Healthy Crop",

                "level":"info",

                "message":"Vegetation is healthy."

            })

        else:

            advice.append({

                "title":"Low Vegetation",

                "level":"warning",

                "message":"Inspect the field."

            })

        # Water

        if ndwi<0:

            advice.append({

                "title":"Possible Water Stress",

                "level":"warning",

                "message":"Consider irrigation."

            })

        # Moisture

        if ndmi<0.20:

            advice.append({

                "title":"Low Moisture",

                "level":"warning",

                "message":"Monitor soil moisture."

            })

        # Crop health

        if crop_health["poor"]>20:

            advice.append({

                "title":"Poor Vegetation",

                "level":"danger",

                "message":"Large portion of farm is unhealthy."

            })

        # Weather

        if weather and weather.get("available"):

            forecast = weather.get("forecast_7day", [])

            next_3 = forecast[:3]

            rain_next_3 = sum(
                (day.get("rain_mm") or 0) for day in next_3
            )

            avg_et0_next_3 = (
                sum((day.get("et0_mm") or 0) for day in next_3)
                / len(next_3)
                if next_3 else 0
            )

            max_wind_next_3 = (
                max((day.get("wind_kmh") or 0) for day in next_3)
                if next_3 else 0
            )

            if rain_next_3 >= 15:

                advice.append({

                    "title": "Rain Expected",

                    "level": "info",

                    "message": (
                        f"{round(rain_next_3, 1)}mm rain forecast "
                        "in the next 3 days — hold off on irrigation."
                    )

                })

            elif ndmi < 0.20 and rain_next_3 < 5:

                advice.append({

                    "title": "Irrigation Recommended",

                    "level": "warning",

                    "message": (
                        "Soil moisture is low and no significant "
                        "rain is expected — irrigate soon."
                    )

                })

            if avg_et0_next_3 > 5:

                advice.append({

                    "title": "High Water Loss Expected",

                    "level": "warning",

                    "message": (
                        f"Evapotranspiration is high (~{round(avg_et0_next_3, 1)}mm/day) "
                        "over the next few days — increase irrigation frequency."
                    )

                })

            if max_wind_next_3 > 25:

                advice.append({

                    "title": "High Wind Advisory",

                    "level": "warning",

                    "message": (
                        f"Winds up to {round(max_wind_next_3, 1)} km/h expected — "
                        "avoid spraying pesticide or fertilizer."
                    )

                })

        # Trend

        advice.append({

            "title":"Historical Trend",

            "level":"info",

            "message":

            f"{trend['trend']} ({trend['change']:+.3f} NDVI)"

        })

        return advice

        # =========================================================
    # MAIN ANALYSIS PIPELINE
    # =========================================================

    @classmethod
    def analyze(cls, polygon, history_start=None, history_end=None):
        """
        Complete TerraMind analysis pipeline.

        Input:
            polygon        - GeoJSON Polygon
            history_start  - optional "YYYY-MM-DD", start of the
                              historical NDVI timeline
            history_end    - optional "YYYY-MM-DD", end of the
                              historical NDVI timeline
                              (defaults to the last 180 days)

        Returns:
            Dictionary ready for the frontend.
        """

        try:

            # --------------------------------------------
            # Initialize
            # --------------------------------------------

            cls.initialize()

            # --------------------------------------------
            # Geometry
            # --------------------------------------------

            geometry = cls.geojson_to_geometry(polygon)

            farm = cls.farm_information(geometry)

            # --------------------------------------------
            # Kick off the independent, slow branches now
            # (historical timeline + weather) so they run
            # in the background while the rest of the
            # pipeline below executes. This is the other
            # big chunk of the original wait time.
            # --------------------------------------------

            background = concurrent.futures.ThreadPoolExecutor(
                max_workers=2
            )

            history_future = background.submit(
                cls.historical_analysis,
                geometry,
                history_start,
                history_end
            )

            weather_future = background.submit(
                get_weather,
                farm["centroid"][1],
                farm["centroid"][0]
            )

            # --------------------------------------------
            # Search Imagery
            # --------------------------------------------

            collection, image_age = cls.search_collection(
                geometry
            )

            # --------------------------------------------
            # Composite
            # --------------------------------------------

            composite = cls.create_composite(
                collection
            )

            # --------------------------------------------
            # Vegetation Indices
            # --------------------------------------------

            indices = cls.calculate_indices(
                composite
            )

            index_statistics = cls.calculate_statistics(
                indices,
                geometry
            )

            # --------------------------------------------
            # Crop Health
            # --------------------------------------------

            classified = cls.classify_crop_health(
                indices["NDVI"]
            )

            crop_health = cls.crop_health_statistics(
                classified,
                geometry
            )

            # --------------------------------------------
            # Satellite Information
            # --------------------------------------------

            satellite = cls.image_information(
                collection,
                image_age
            )

            # --------------------------------------------
            # Visualization
            # --------------------------------------------

            visualization = cls.create_visualizations(
                composite,
                indices,
                geometry
            )

            # --------------------------------------------
            # Histogram
            # --------------------------------------------

            histogram = cls.ndvi_histogram(
                indices["NDVI"],
                geometry
            )

            # --------------------------------------------
            # Collect background results
            # --------------------------------------------

            history = history_future.result()

            weather = weather_future.result()

            background.shutdown(wait=True)

            trend = cls.vegetation_trend(
                history
            )

            # --------------------------------------------
            # AI Advisory
            # --------------------------------------------

            advisory = cls.ai_insights(

                index_statistics,

                crop_health,

                history,

                weather

            )

            # --------------------------------------------
            # Final JSON
            # --------------------------------------------

            return {

                "success": True,

                "farm": farm,

                "satellite": satellite,

                "indices": index_statistics,

                "statistics": {

                    "crop_health": crop_health,

                    "histogram": histogram,

                    "trend": trend

                },

                "history": history,

                "weather": weather,

                "visualization": visualization,

                "advisory": advisory,

                "engine": {

                    "name":
                        "TerraMind Satellite Engine",

                    "version":
                        "2.0",

                    "provider":
                        "Google Earth Engine",

                    "collection":
                        cls.COLLECTION

                }

            }

        except Exception as e:

            import traceback

            traceback.print_exc()

            return {

                "success": False,

                "message": str(e)

            }