import { Request, Response } from "express";
import { validateVatNumber, isViesStrict } from "../services/vies.js";

export async function validateNif(req: Request, res: Response) {
  const taxId = String(req.body?.taxId ?? "").trim();

  if (taxId.length < 5) {
    res.status(400).json({ error: "taxId requerido (mín. 5 caracteres)" });
    return;
  }

  const result = await validateVatNumber(taxId);
  res.json({ ...result, strictMode: isViesStrict() });
}
