"""
export.py — Export routes (CSV, PDF)
"""
import io
import csv
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()


class ExportRequest(BaseModel):
    all_lots: list
    metrics: dict = {}


@router.post("/export/csv")
def export_csv(req: ExportRequest):
    output = io.StringIO()
    fieldnames = [
        "Navire","Quai","Qualité","TD","Chargé","Axe_U","Grue","Hall",
        "H_Acc","H_Charg","H_Fin","H_CTE","Att_Quai","Att_Axe","Statut"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for s in req.all_lots:
        writer.writerow({
            "Navire": s.get("navire",""),
            "Quai": s.get("quai",""),
            "Qualité": s.get("qualite",""),
            "TD": s.get("td", 0),
            "Chargé": s.get("td_charged", 0),
            "Axe_U": s.get("axe",""),
            "Grue": s.get("grue",""),
            "Hall": s.get("hall",""),
            "H_Acc": s.get("h_acc_start",""),
            "H_Charg": s.get("h_load_start",""),
            "H_Fin": s.get("h_fin_end",""),
            "H_CTE": s.get("h_cte_end",""),
            "Att_Quai": s.get("wait_quai", 0),
            "Att_Axe": s.get("wait_axe", 0),
            "Statut": "OK" if s.get("scheduled") else s.get("status","—"),
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Planning_OCP.csv"}
    )
