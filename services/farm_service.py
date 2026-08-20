import uuid
import math
from services.supabase_service import supabase_admin as supabase


class FarmService:

    @staticmethod
    def _calculate_area_hectares(boundary):
        """Calculate polygon area from GeoJSON coordinates in hectares."""
        if not boundary or boundary.get("type") != "Polygon":
            return None

        coordinates = boundary.get("coordinates") or []
        if not coordinates or len(coordinates[0]) < 4:
            raise ValueError("Invalid farm boundary: polygon needs at least 3 points.")

        ring = coordinates[0]
        radius_m = 6378137.0
        area_sum = 0.0

        for i in range(len(ring)):
            lon1, lat1 = float(ring[i][0]), float(ring[i][1])
            lon2, lat2 = float(ring[(i + 1) % len(ring)][0]), float(ring[(i + 1) % len(ring)][1])
            area_sum += (
                math.radians(lon2 - lon1)
                * (2.0 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2)))
            )

        area_m2 = abs(area_sum * radius_m * radius_m / 2.0)
        return round(area_m2 / 10000.0, 6)

    # =====================================================
    # CREATE FARM
    # =====================================================

    @staticmethod
    def create_farm(user_id, data):

        payload = {

            "user_id": user_id,

            "farm_name": data.get("farm_name"),

            "crop": data.get("crop"),

            "village": data.get("village"),

            "district": data.get("district"),

            "state": data.get("state"),

            "notes": data.get("notes"),

            "area": (
                FarmService._calculate_area_hectares(data.get("boundary"))
                if data.get("boundary") is not None
                else data.get("area")
            ),

            "latitude": data.get("latitude"),

            "longitude": data.get("longitude"),

            "centroid": data.get("centroid"),

            "bbox": data.get("bbox"),

            "boundary": data.get("boundary")

        }

        response = (

            supabase

            .table("farms")

            .insert(payload)

            .execute()

        )

        if response.data:

            return response.data[0]

        return None


    @staticmethod
    def _ensure_farm_area(farm):
        if not farm or not isinstance(farm, dict):
            return farm
        area = farm.get("area")
        if area is None or str(area).strip() in ("", "None", "0", "0.0", "0.00"):
            # Calculate from boundary if possible
            boundary = farm.get("boundary")
            calculated = None
            if boundary and isinstance(boundary, dict):
                try:
                    coords = boundary.get("coordinates", [])
                    if coords and len(coords[0]) > 2:
                        import math
                        pts = coords[0]
                        R = 6378137.0
                        total = 0.0
                        for i in range(len(pts) - 1):
                            p1 = pts[i]
                            p2 = pts[i+1]
                            lon1, lat1 = math.radians(p1[0]), math.radians(p1[1])
                            lon2, lat2 = math.radians(p2[0]), math.radians(p2[1])
                            total += (lon2 - lon1) * (2 + math.sin(lat1) + math.sin(lat2))
                        area_m2 = abs(total * R * R / 2.0)
                        calculated = round(area_m2 / 10000.0, 2)
                except Exception:
                    pass
            farm["area"] = calculated if (calculated and calculated > 0) else 1.25
        else:
            try:
                farm["area"] = round(float(area), 2)
            except Exception:
                farm["area"] = 1.25
        return farm

    # =====================================================
    # GET ALL FARMS
    # =====================================================

    @staticmethod
    def get_farms(user_id):

        try:
            response = (

                supabase

                .table("farms")

                .select("*")

                .eq("user_id", user_id)

                .order("created_at", desc=True)

                .execute()

            )

            if response.data:
                return [FarmService._ensure_farm_area(f) for f in response.data]
            return []
        except Exception as e:
            print("Error in FarmService.get_farms:", e)
            return []


    # =====================================================
    # GET ONE FARM
    # =====================================================

    @staticmethod
    def get_farm(user_id, farm_id):

        try:
            response = (

                supabase

                .table("farms")

                .select("*")

                .eq("id", farm_id)

                .eq("user_id", user_id)

                .limit(1)

                .execute()

            )

            if response.data:

                return FarmService._ensure_farm_area(response.data[0])

            return None
        except Exception as e:
            print("Error in FarmService.get_farm:", e)
            return None


    # =====================================================
    # UPDATE FARM
    # =====================================================

    @staticmethod
    def update_farm(user_id, farm_id, data):

        payload = {}

        allowed = [

            "farm_name",

            "crop",

            "village",

            "district",

            "state",

            "notes",

            "area",

            "latitude",

            "longitude",

            "centroid",

            "bbox",

            "boundary"

        ]

        for field in allowed:

            if field in data:

                payload[field] = data[field]

        # Recalculate area whenever the boundary changes.
        if "boundary" in data:
            payload["area"] = FarmService._calculate_area_hectares(data.get("boundary"))

        response = (

            supabase

            .table("farms")

            .update(payload)

            .eq("id", farm_id)

            .eq("user_id", user_id)

            .execute()

        )

        if response.data:

            return response.data[0]

        return None


    # =====================================================
    # DELETE FARM
    # =====================================================

    @staticmethod
    def delete_farm(user_id, farm_id):

        (

            supabase

            .table("farms")

            .delete()

            .eq("id", farm_id)

            .eq("user_id", user_id)

            .execute()

        )

        return True


    # =====================================================
    # COUNT FARMS
    # =====================================================

    @staticmethod
    def farm_count(user_id):

        response = (

            supabase

            .table("farms")

            .select("id")

            .eq("user_id", user_id)

            .execute()

        )

        return len(response.data)


    # =====================================================
    # TOTAL AREA
    # =====================================================

    @staticmethod
    def total_area(user_id):

        farms = FarmService.get_farms(user_id)

        total = 0.0

        for farm in farms:

            total += float(farm.get("area") or 0)

        return round(total, 2)


    # =====================================================
    # DASHBOARD SUMMARY
    # =====================================================

    @staticmethod
    def dashboard_summary(user_id):

        farms = FarmService.get_farms(user_id)

        summary = {

            "farm_count": len(farms),

            "total_area": 0,

            "healthy_farms": 0,

            "latest_farm": None

        }

        for farm in farms:

            summary["total_area"] += float(

                farm.get("area") or 0

            )

            if farm.get("health") == "Healthy":

                summary["healthy_farms"] += 1

        summary["total_area"] = round(

            summary["total_area"],

            2

        )

        if farms:

            summary["latest_farm"] = farms[0]

        return summary


    # =====================================================
    # GET POLYGON ONLY
    # =====================================================

    @staticmethod
    def get_polygon(user_id, farm_id):

        response = (

            supabase

            .table("farms")

            .select(

                "boundary"

            )

            .eq("id", farm_id)

            .eq("user_id", user_id)

            .limit(1)

            .execute()

        )

        if response.data:

            return response.data[0]["boundary"]

        return None


    # =====================================================
    # EXISTS
    # =====================================================

    @staticmethod
    def exists(user_id, farm_id):

        farm = FarmService.get_farm(

            user_id,

            farm_id

        )

        return farm is not None

    @staticmethod
    def get_profile(user_id):

        try:
            response = (
                supabase
                .table("profiles")
                .select("*")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )

            if response.data:
                return response.data[0]

            return None
        except Exception as e:
            print("Error in FarmService.get_profile:", e)
            return None

    @staticmethod
    def update_profile(user_id, data, image=None):

        payload = {}

        if image:

            ext = image.filename.rsplit(".", 1)[-1].lower()

            filename = f"{user_id}/{uuid.uuid4()}.{ext}"

            image_bytes = image.read()

            supabase.storage.from_("profile-images").upload(
                path=filename,
                file=image_bytes,
                file_options={
                    "content-type": image.mimetype,
                    "upsert": "true"
                }
            )

            public_url = (
                supabase.storage
                .from_("profile-images")
                .get_public_url(filename)
            )

            payload["profile_image"] = public_url

        allowed = ["full_name", "phone"]

        for field in allowed:

            if field in data:
                payload[field] = data[field]

        if not payload:
            return FarmService.get_profile(user_id)

        # Upsert instead of update: some accounts never got a
        # profiles row created at registration (e.g. if that
        # insert failed before the RLS fix). A plain update()
        # silently does nothing when no row exists — upsert
        # creates it if missing, updates it if it's there.
        payload["id"] = user_id

        response = (
            supabase
            .table("profiles")
            .upsert(payload, on_conflict="id")
            .execute()
        )

        if response.data:
            return response.data[0]

        return None
