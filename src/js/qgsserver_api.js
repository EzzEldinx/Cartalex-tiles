// Tegola-only build: stub out QGIS Server calls so the app never hits port 8085
// and nothing breaks if legacy modules import these helpers.

export async function getWmtsLayersCapabilities(){
  return [];
}

export async function getWfsLayersCapabilities(){
  return [];
}

export async function getWmsProjectSettings(){
  return { Capability: { Layer: { Layer: [] }, LayerDrawingOrder: '' } };
}
