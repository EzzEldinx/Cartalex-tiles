const urlTegola = "http://localhost:8080";

export const qgs_config = {
    // Kept for compatibility; not used in Tegola-only mode
    urlWMTSGetCapabilities: `${urlTegola}/maps/cartalex/WMTSCapabilities.xml`,
    urlWFSGetCapabilities: `${urlTegola}/maps/cartalex/WFSCapabilities.xml`,
    urlWMSGetProjectSettings: `${urlTegola}/maps/cartalex/WMSProjectSettings.xml`,

    // Not used; left as placeholders to avoid runtime errors in legacy code paths
    urlSitesFouillesWFS: `${urlTegola}/noop`,
    getWfsFeatureUrl: `${urlTegola}/noop`
};
