export const filters_config = {
    'sitesFouilles' : [
        {
            name: 'vestiges',
            infos: "Ce filtre permet de sélectionner les sites de fouilles sur lesquels ont été découverts\n \
             des vestiges dont la caractérisation et la datations correspondent aux valeurs sélectionnées. \n \
             Un site de fouille peut présenter plusieurs vestiges.",
            sub_filters: [
                {
                    // 1. "caracterisation" → "Caractérisation"
                    name: 'caracterisation',
                    // Adding alias for display name change
                    request_options: {
                        alias: 'Caractérisation'
                    }
                },
                {
                    // 2. "period" → "Période"
                    name: 'periode',
                     // Adding alias for display name change
                    request_options: {
                        fromTable : 'periodes',
                        order: 'date_debut',
                        alias: 'Période'
                    }
                },
                {
                    // 3. "datations" → "Datation"
                    name: 'datations',
                    options:{
                        isNumeric: true
                    },
                    request_options:{
                        floor: 'date_debut',
                        ceil: 'date_fin',
                        // Adding alias for display name change
                        alias: 'Datation'
                    }
                }
            ]
        },
        {
            name: 'decouvertes',
            infos: "Ce filtre permet de sélectionner les sites de fouilles selon la date et les acteurs des \n \
            différentes prospections qui y ont été menées. \n \
            Un site peut avoir été prospecté plusieurs fois, et par différents inventeurs.",
            sub_filters: [
                {
                    name: 'nom',
                    sub_filter_infos: "Des informations sur ce sous-filtre",
                    request_options: {
                        fromTable: 'personnes',
                        // 4. "inventeur" → "Inventeur"
                        alias: 'Inventeur'
                    }

                },
                {
                    name: 'date_decouverte',
                    request_options: {
                        // 5. "date-de-la-decouverte" → "Date de la découverte"
                        alias: 'Date de la découverte'
                    }
                }
            ]
        },
        {
            name: 'bibliographies',
            infos: "Ce filtre permet de sélectionner les sites de fouilles d'après l'ouvrage dans lequel en apparaît \n \
            une mention, ou bien selon l'auteur qui les évoque. Un site peut-être mentionné dans plusieurs bibliographies \
            et une même bibliographie peut citer différents sites.",
            sub_filters: [
                {
                    name: 'nom_document',
                    request_options: {
                        // 6. "nom-du-document" → "Nom du document"
                        alias: 'Nom du document'
                    }
                },
                {
                    name: 'nom',
                    request_options: {
                        fromTable: 'personnes',
                        // 7. "auteur" → "Auteur"
                        alias: 'Auteur'
                    }
                }
            ]
        }
    ]
    // The parcellesRegion filter object has been removed from here.
};
 // The api_at constant definition should remain unchanged
 export const api_at = "http://85.234.139.116:3000";