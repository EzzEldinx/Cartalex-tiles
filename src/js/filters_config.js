export const filters_config = {
        'sitesFouilles' : [
            {
                name: 'vestiges', // <-- ده الـ ID الداخلي (نسيبه)
                displayName: 'Vestiges', // <-- ده اسم العرض الجديد
                infos: "Ce filtre permet de sélectionner les sites de fouilles sur lesquels ont été découverts\n \
                 des vestiges dont la caractérisation et la datations correspondent aux valeurs sélectionnées. \n \
                 Un site de fouille peut présenter plusieurs vestiges.",
                sub_filters: [
                    {
                        name: 'caracterisation',
                        request_options: {
                            alias: 'Caractérisation'
                        }
                    },
                    {
                        name: 'periode',
                        request_options: {
                            fromTable : 'periodes',
                            order: 'date_debut',
                            alias: 'Période'
                        }
                    },
                    {
                        name: 'datations',
                        options:{
                            isNumeric: true
                        },
                        request_options:{
                            floor: 'date_debut',
                            ceil: 'date_fin',
                            alias: 'Datation'
                        }
                    }
                ]
            },
            {
                name: 'decouvertes', // <-- ده الـ ID الداخلي (نسيبه)
                displayName: 'Découvertes', // <-- ده اسم العرض الجديد
                infos: "Ce filtre permet de sélectionner les sites de fouilles selon la date et les acteurs des \n \
                différentes prospections qui y ont été menées. \n \
                Un site peut avoir été prospecté plusieurs fois, et par différents inventeurs.",
                sub_filters: [
                    {
                        name: 'nom',
                        sub_filter_infos: "Des informations sur ce sous-filtre",
                        request_options: {
                            fromTable: 'personnes',
                            alias: 'Inventeur'
                        }
    
                    },
                    {
                        name: 'date_decouverte',
                        request_options: {
                            alias: 'Date de la découverte'
                        }
                    }
                ]
            },
            {
                name: 'bibliographies', // <-- ده الـ ID الداخلي (نسيبه)
                displayName: 'Bibliographies', // <-- ده اسم العرض الجديد
                infos: "Ce filtre permet de sélectionner les sites de fouilles d'après l'ouvrage dans lequel en apparaît \n \
                une mention, ou bien selon l'auteur qui les évoque. Un site peut-être mentionné dans plusieurs bibliographies \
                et une même bibliographie peut citer différents sites.",
                sub_filters: [
                    {
                        name: 'nom_document',
                        request_options: {
                            alias: 'Nom du document'
                        }
                    },
                    {
                        name: 'nom',
                        request_options: {
                            fromTable: 'personnes',
                            alias: 'Auteur'
                        }
                    }
                ]
            }
        ]
    };
     
    export const api_at = "http://85.234.139.116:3000";