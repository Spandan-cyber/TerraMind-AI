"""
==========================================================
TerraMind Analysis Service
==========================================================
"""

from services.farm_service import FarmService
from services.satellite_engine import SatelliteEngine
from services.supabase_service import supabase_admin as supabase


class AnalysisService:

    @staticmethod
    def run(farm_id: str, user_id: str):
        """
        Runs satellite analysis and stores the result.
        """

        # ------------------------------------------
        # Load Farm
        # ------------------------------------------
        farm = FarmService.get_farm(user_id, farm_id)

        if farm is None:
            raise Exception("Farm not found.")

        # ------------------------------------------
        # Boundary & Fallback Geometry
        # ------------------------------------------
        boundary = farm.get("boundary")
        if not boundary:
            lat = float(farm.get("latitude") or 22.5726)
            lon = float(farm.get("longitude") or 88.3639)
            delta = 0.001
            boundary = {
                "type": "Polygon",
                "coordinates": [[
                    [lon - delta, lat - delta],
                    [lon + delta, lat - delta],
                    [lon + delta, lat + delta],
                    [lon - delta, lat + delta],
                    [lon - delta, lat - delta]
                ]]
            }

        # ------------------------------------------
        # Run Satellite Engine
        # ------------------------------------------
        result = SatelliteEngine.analyze(polygon=boundary)

        if not result.get("success"):
            return result

        # ------------------------------------------
        # Save Analysis
        # ------------------------------------------
        AnalysisService.save_history(
            user_id=user_id,
            farm_id=farm_id,
            analysis=result,
        )

        return result

    @staticmethod
    def save_history(user_id: str, farm_id: str, analysis: dict):
        payload = {
            "user_id": user_id,
            "farm_id": farm_id,
            "indices": analysis.get("indices"),
            "satellite": analysis.get("satellite"),
            "weather": analysis.get("weather"),
            "health": analysis.get("statistics", {}).get("crop_health"),
            "advisory": analysis.get("advisory"),
            "result": analysis,
        }

        supabase.table("analysis_history").insert(payload).execute()

    @staticmethod
    def get_history(farm_id: str, user_id: str):
        response = (
            supabase
            .table("analysis_history")
            .select("*")
            .eq("farm_id", farm_id)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        return response.data

    @staticmethod
    def get_latest_advisory(user_id: str):
        """
        Returns the advisory list from the user's most recent
        analysis across all farms. Empty list if no history yet.
        """
        history = AnalysisService.get_all_history(user_id)

        if not history:
            return []

        return history[0].get("advisory") or []

    @staticmethod
    def get_all_history(user_id):
        farms = (
            supabase
            .table("farms")
            .select("id,farm_name")
            .eq("user_id", user_id)
            .execute()
        )

        farm_map = {f["id"]: f["farm_name"] for f in farms.data}

        if not farm_map:
            return []

        history = (
            supabase
            .table("analysis_history")
            .select("*")
            .in_("farm_id", list(farm_map.keys()))
            .order("created_at", desc=True)
            .execute()
        )

        result = []

        for item in history.data:
            item["farm_name"] = farm_map.get(item["farm_id"], "Unknown")
            result.append(item)

        return result