/*jshint jasmine: true, esnext: true, node: true */
/*globals Co, sb, quickPromise */

describe("outlineEditor", function () {
    "use strict";
    "import Co.test, Co.test.utilities";

    if (typeof module !== 'undefined') {
        require("hydra-core").scan(require.resolve('hydra-base'), 'base').register(module);
    }

    sb.processor.outlineEditor("spec", function () {});

    it("is a Co module", function () {
        expect(sb.processor.outlineEditor.isCo).toBeTruthy();
    });

    describe("instance", function () {

        var instance, configCtxService, groupService, configUrlUtil, contentURLUtil, urlUtil, featureToggle, userAuth, pageOutlineUtil;
        var configCtx, features, isCobaltUser, contentBlockUtil;

        beforeEach(function () {

            configCtx = {
                page: "HomePage",
                webId: "dealer"
            };
            configCtxService = jasmine.createSpyObj("Co.context.configCtx", ["fetch"]);
            configCtxService.fetch.andCallFake(function () {
                return configCtx;
            });
            urlUtil = jasmine.createSpyObj("Co.util.url", ["formatQuery"]);
            urlUtil.formatQuery.andReturn({});

            configUrlUtil = jasmine.createSpyObj("sb.util.urlUtils", ["getConfigCtxAsQueryParam"]);
            configUrlUtil.getConfigCtxAsQueryParam.andReturn("configCtx={page=HomePage&webId=gmps-gold&version=LIVE}");
            contentBlockUtil = jasmine.createSpyObj("sb.util.contentBlocks", ["getCardId"]);
            contentBlockUtil.getCardId.andCallFake(function(card){
                return card.id;
            });
            pageOutlineUtil = jasmine.createSpyObj("sb.util.pageOutlineUtil", ["getDisplayableOutlineName"]);
            pageOutlineUtil.getDisplayableOutlineName.andReturn("Standard");
            features = {
                "hydra.editor.cards.sorttreev2.enabled": {
                    deadline: new Date("October 10, 2018"),
                    value: true
                },
                "hydra.editor.mastersite.cards.acrosslevels.dragdrop.enabled": {
                    deadline: new Date("October 10, 2018"),
                    value: true
                },
                "hydra.use.hero.builder": {
                    deadline: new Date("October 30, 2018"),
                    value: false
                },
                "hydra.config.contentBlocksV2": {
                    value: false
                },
                "hydra.editor.cards.collapse.enabled": {
                    deadline: new Date("Octorber 30, 2018"),
                    value: true
                }
            };

            featureToggle = jasmine.createSpyObj("Co.app.featureToggles", ["getFeature"]);
            featureToggle.getFeature.andCallFake(function (f) {
                var feature = features[f] || '';
                if (Date.now() > feature.deadline) {
                    expect("Feature toggle '" + f + "' is stale. Delete its toggle-related code or update its deadline in test.").toBe(false);
                }
                return feature.value;
            });

            isCobaltUser = true;

            userAuth = {
                isCobaltUser: function () {
                    return quickPromise(isCobaltUser);
                }
            };

            groupService = jasmine.createSpyObj("Co.service.group", ["siteType"]);

            contentURLUtil = jasmine.createSpyObj("sb.util.contentUrlUtil", ["getContentURL"]);

            instance = Co.inject(sb.processor.outlineEditor, configCtxService, urlUtil, featureToggle, userAuth, groupService, configUrlUtil, contentURLUtil, pageOutlineUtil, contentBlockUtil).create();

        });

        describe(".process()", function () {
            var request, view, l1Card;

            function extractQueryParams(url){
                return base.graph.nodeURI.create(url)
            }

            beforeEach(function () {
                request = {
                    query: {},
                    originalUrl: "submitURL"
                };
                view = {
                    subject: {
                        name: 'HomePage',
                        cards: [{
                            name: 'main',
                            relName: 'main',
                            id: 'view/card/main',
                            disabled: '',
                            meta: {
                                locks: {}
                            },
                            cards: [{
                                    name: 'l2Card-1',
                                    id: 'view/card/l2-1',
                                    disabled: '',
                                    meta: {
                                        locks: {}
                                    }
                             },
                                {
                                    name: 'l2Card-2',
                                    id: 'view/card/l2-2',
                                    disabled: '',
                                    meta: {
                                        locks: {}
                                    },
                                    cards: [
                                        {
                                            name: 'l3Card-1',
                                            id: 'view/card/l3-1',
                                            disabled: '',
                                            meta: {
                                                locks: {}
                                            }
                                     }
                                 ]
                             }
                         ]
                     }]
                    }
                };
                l1Card = view.subject.cards[0];
                configUrlUtil.getConfigCtxAsQueryParam.andReturn({});

            });

            describe("sets Up the BodyCard for ContentBlock outline", function () {
                var cbCard;

                beforeEach(function () {
                    cbCard = {
                        id: 'view/card/uuid',
                        name: 'iamCBCard',
                        displayName: 'I am CB Card',
                        contentBlockCategory: 'CB Category',
                        relName: 'iamCBCard'
                    };
                    view.subject.cards[0] = cbCard;
                    contentURLUtil.getContentURL.andReturn('contentURL');
                });

                it("sets card options when the main card doesnot have child cards", function (done) {
                    var result = {
                        "add": "cardSelectorModal",
                        "replace": undefined,
                        "configCtx": {},
                        "pageOption": undefined,
                        "decks": true,
                        "content": 'contentURL&L1CardContent=true',
                        "properties": "propertiesModal",
                        "style": "styleModal",
                        "admin": "adminModal"
                    };
                    Co.when(instance.process(request, view)).then(function () {
                        expect(cbCard.options).toEqual(result);
                    }).then(done, done);

                });


                it("sets card options for the child cards of the main card", function (done) {
                    cbCard.cards = [{
                            id: 'view/card/uuid1',
                            name: 'iAmCBChild1',
                            displayName: 'I am CB Child1',
                    }, {
                            id: 'view/card/uuid2',
                            name: 'iamCBChild2',
                            displayName: 'I am CB Child2'
                    }
                    ];
                    var topCardOptions = {
                        "add": "cardSelectorModal",
                        "configCtx": {},
                        "decks": true,
                        "content": 'contentURL&L1CardContent=true',
                        "properties": "propertiesModal",
                        "style": "styleModal",
                        "replace": undefined,
                        "delete": undefined,
                        "admin": "adminModal"
                    };
                    var childCard1Options = {};
                    Co.extend(childCard1Options, topCardOptions);
                    childCard1Options.content = 'contentURL';
                    childCard1Options.replace = 'cardSelectorModal';
                    childCard1Options.delete = 'properties';
                    childCard1Options.name = cbCard.cards[0].name;
                    childCard1Options.decks = false;
                    cbCard.cards[0].parentCardDisplayName = cbCard.displayName;
                    cbCard.cards[0].parentCardId = cbCard.id;
                    cbCard.cards[0].parentCardName = cbCard.name;
                    cbCard.cards[1].parentCardDisplayName = cbCard.displayName;
                    cbCard.cards[1].parentCardId = cbCard.id;
                    cbCard.cards[1].parentCardName = cbCard.name;
                    var childCard2Options = {};
                    Co.extend(childCard2Options, childCard1Options);
                    childCard2Options.name = cbCard.cards[1].name;
                    Co.when(instance.process(request, view)).then(function () {
                        expect(cbCard.options).toEqual(topCardOptions);
                        expect(cbCard.cards[0].options).toEqual(childCard1Options);
                        expect(cbCard.cards[1].options).toEqual(childCard2Options);
                    }).then(done, done);

                });

            });

            it("sets Up the BodyCard for Normal outline and adds options to it and its child cards", function (done) {

                function assertCardTrayURLs(card){
                    expect(extractQueryParams(card.propURL).params.selectedName).toBe(card.name);
                    expect(extractQueryParams(card.propURL).params.selectedId).toBe(card.id);
                    expect(extractQueryParams(card.styleURL).params.selectedName).toBe(card.name);
                    expect(extractQueryParams(card.styleURL).params.selectedId).toBe(card.id);
                    expect(extractQueryParams(card.addCardURL).params.selectedId).toBe(card.id);
                    expect(extractQueryParams(card.addCardURL).params.selectedName).toBe(card.name);
                    expect(extractQueryParams(card.deleteCardURL).params.selectedId).toBe(card.id);
                    expect(extractQueryParams(card.deleteCardURL).params.method).toBe('delete');
                    expect(extractQueryParams(card.replaceCardURL).params.selectedId).toBe(card.id);
                    if(card.relName === 'main') {
                        expect(extractQueryParams(card.replaceCardURL).params.operation).toBe('replace');
                    }else{
                        expect(extractQueryParams(card.replaceCardURL).params.exchangeCard).toBe('exchange');
                    }
                };
                var contentURL, l2Card_1 = l1Card.cards[0],
                    l2Card_2 = l1Card.cards[1],
                    configFormURL,
                    l3Card_1 = l1Card.cards[1].cards[0];

                contentURL = "route/base-view/card";
                contentURLUtil.getContentURL.andCallFake(function () {
                    return contentURL;
                });

                var configCTX = "configCtx={page=HomePage&webId=gmps-gold&version=LIVE}";
                configUrlUtil.getConfigCtxAsQueryParam.andCallFake(function () {
                    return configCTX;
                });

                configFormURL = 'route/base-view/contentFilterConfigurator?pageOutlineConfigForm=true&' + configCTX + '&selectedId=' + l3Card_1.id;

                l3Card_1.cardType = "form";

                l3Card_1.contentMapper = {
                    id: 'content/contentMapper/id1',
                    name: 'inventorySearchContentMapper',
                    configForm: {
                        id: 'view/form/id1',
                        name: 'inventorysearchForm'
                    }
                };

                var l1CardOptions = {
                    "name": 'main',
                    "add": "cardSelectorModal",
                    "configCtx": configCTX,
                    "decks": true,
                    "pageOption": undefined,
                    "properties": "propertiesModal",
                    "style": "styleModal",
                    "admin": "adminModal",
                    "content": contentURL + "&L1CardContent=true"
                };

                var l2Card1_Options = {};
                Co.extend(l2Card1_Options, l1CardOptions);
                l2Card1_Options.name = "l2Card-1";
                l2Card1_Options.pageOption = false;
                l2Card1_Options.replace = "cardSelectorModal";
                l2Card1_Options.delete = "properties";
                l2Card1_Options.decks = false;
                l2Card1_Options.content = contentURL;

                var l2Card2_Options = {};
                Co.extend(l2Card2_Options, l2Card1_Options);
                l2Card2_Options.name = "l2Card-2";
                l2Card2_Options.decks = true;

                var l3Card_Options = {};
                Co.extend(l3Card_Options, l2Card1_Options);
                l3Card_Options.name = "l3Card-1";
                l3Card_Options.decks = false;

                Co.when(instance.process(request, view)).then(function () {
                    expect(l1Card.options).toBeDefined();
                    expect(l1Card.options).toEqual(l1CardOptions);
                    assertCardTrayURLs(l1Card);
                    expect(view.showPage).toBe(true);
                    expect(view.selectedOutline).toBe('Standard');
                    expect(l2Card_1.options).toBeDefined();
                    expect(l2Card_1.options).toEqual(l2Card1_Options);
                    assertCardTrayURLs(l2Card_1);
                    expect(l2Card_2.options).toBeDefined();
                    expect(l2Card_2.options).toEqual(l2Card2_Options);
                    assertCardTrayURLs(l2Card_2);
                    expect(l2Card_2.configURL).toBe(undefined);
                    expect(l3Card_1.options).toBeDefined();
                    expect(l3Card_1.options).toEqual(l3Card_Options);
                    assertCardTrayURLs(l3Card_1);
                    expect(l3Card_1.configURL).toBe(configFormURL);
                }).then(done, done);

            });

            it("sets Up the BodyCard when there are proxy cards within", function (done) {
                var proxyCard = l1Card.cards[1];
                proxyCard.meta={
                    proxy:{
                        id:'iamCBTopCard',
                        links: {
                            block:{
                                name:'block',
                                href:'view/block?name=CB-abe51836-2d3b-4364-9836-97e31fcf0bd3&owner=gmps-kool&instance=CB-8baa0f29-9483-4b5e-ba42-ef92e106ab58'
                            }
                        }

                    }
                };

                Co.when(instance.process(request, view)).then(function (view) {
                    var indices = 'CB-abe51836-2d3b-4364-9836-97e31fcf0bd3:gmps-kool,CB-8baa0f29-9483-4b5e-ba42-ef92e106ab58';
                    var actualProxyCard = view.subject.cards[0].cards[1]
                    expect(extractQueryParams(actualProxyCard.replaceCardURL).params.indices).toBeUndefined();
                    expect(extractQueryParams(actualProxyCard.deleteCardURL).params.indices).toBeUndefined();
                    expect(extractQueryParams(actualProxyCard.propURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.addCardURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.styleURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.adminURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.cards[0].replaceCardURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.cards[0].deleteCardURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.cards[0].propURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.cards[0].addCardURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.cards[0].styleURL).params.indices).toBe(indices);
                    expect(extractQueryParams(actualProxyCard.cards[0].adminURL).params.indices).toBe(indices);
                    expect(actualProxyCard.dataSortIdAttr).toBe("data-sort-id=\"iamCBTopCard\"");
                    expect(actualProxyCard.dataIndicesAttr).toBe("data-indices=\"" + indices + "\"");
                }).then(done, done);

            });

            it("sets Up the BodyCard for LandingPage and adds options to it and its child cards", function (done) {

                view = {
                    subject: {
                        name: 'LandingPage_123',
                        cards: [{
                            name: 'main',
                            relName: 'main',
                            id: 'view/card/main',
                            disabled: '',
                            meta: {
                                locks: {}
                            },
                            cards: [{
                                    name: 'l2Card-1',
                                    id: 'view/card/l2-1',
                                    disabled: '',
                                    meta: {
                                        locks: {}
                                    }
                            }
                            ]
                        }]
                    }
                };

                l1Card = view.subject.cards[0];


                var contentURL;


                contentURL = "route/base-view/card";
                contentURLUtil.getContentURL.andCallFake(function () {
                    return contentURL;
                });

                configCtx = {
                    page: "LandingPage_123",
                    webId: "dealer"
                };
                configCtxService.fetch.andCallFake(function () {
                    return configCtx;
                });

                var configCTX = "configCtx={page=LandingPage_123&webId=gmps-gold&version=LIVE}";
                configUrlUtil.getConfigCtxAsQueryParam.andCallFake(function () {
                    return configCTX;
                });

                var l1CardOptions = {
                    "name": 'main',
                    "add": "cardSelectorModal",
                    "replace": "l1CardSelector",
                    "configCtx": configCTX,
                    "decks": true,
                    "pageOption": undefined,
                    "properties": "propertiesModal",
                    "style": "styleModal",
                    "admin": "adminModal",
                    "content": contentURL + "&L1CardContent=true"
                };

                Co.when(instance.process(request, view)).then(function () {
                    expect(l1Card.options).toBeDefined();
                    expect(l1Card.options).toEqual(l1CardOptions);
                    expect(view.showPage).toBe(true);
                    expect(view.selectedOutline).toBe('Standard');
                }).then(done, done);

            });

            describe("sets Up the locks for cards", function () {

                it("sets card options for the main card", function (done) {
                    l1Card.meta.locks = {
                        "position": true,
                        "replace": false,
                        "add": false,
                        "delete": false,
                        "changeparent": false,
                        "content": false
                    };
                    Co.when(instance.process(request, view)).then(function () {

                        expect(l1Card.disabled).toBe(' lock-position');

                    }).then(done, done);
                });
                it("sets card options for the l2 cards of the main card", function (done) {
                    var l2Card_1 = l1Card.cards[0];
                    l2Card_1.meta.locks = {
                        "position": false,
                        "replace": false,
                        "add": false,
                        "delete": false,
                        "changeparent": true,
                        "content": false
                    };
                    Co.when(instance.process(request, view)).then(function () {

                        expect(l2Card_1.disabled).toBe(' lock-changeparent');

                    }).then(done, done);

                });

            });

            it("Setup Outline for Footer Card", function (done) {

                var footerCard = {};
                Co.extend(footerCard, view.subject.cards[0]);
                footerCard.name = 'footer';
                footerCard.id = 'view/card/footer';
                footerCard.relName = 'footer';
                footerCard.meta = {
                    locks: {}
                };
                view.subject.cards = [footerCard];
                view.subject.cards.footer = footerCard;

                var contentURL, l2Card_1 = footerCard.cards[0],
                    l2Card_2 = footerCard.cards[1],
                    configFormURL,
                    l3Card_1 = footerCard.cards[1].cards[0];

                contentURL = "route/base-view/card";
                contentURLUtil.getContentURL.andCallFake(function () {
                    return contentURL;
                });

                var configCTX = "configCtx={page=HomePage&webId=gmps-gold&version=LIVE}";
                configUrlUtil.getConfigCtxAsQueryParam.andCallFake(function () {
                    return configCTX;
                });

                configFormURL = 'route/base-view/contentFilterConfigurator?pageOutlineConfigForm=true&' + configCTX + '&selectedId=' + l3Card_1.id;

                l3Card_1.cardType = "form";

                l3Card_1.contentMapper = {
                    id: 'content/contentMapper/id1',
                    name: 'inventorySearchContentMapper',
                    configForm: {
                        id: 'view/form/id1',
                        name: 'inventorysearchForm'
                    }
                };

                var footerCardOptions = {
                    "name": 'footer',
                    "add": "footerCardSelectorModal",
                    "configCtx": configCTX,
                    "decks": true,
                    "pageOption": true,
                    "properties": "propertiesModal",
                    "style": "styleModal",
                    "admin": "adminModal"
                };

                var l2Card1_Options = {};
                Co.extend(l2Card1_Options, footerCardOptions);
                l2Card1_Options.name = "l2Card-1";
                l2Card1_Options.add = "cardSelectorModal";
                l2Card1_Options.replace = "cardSelectorModal";
                l2Card1_Options.delete = "properties";
                l2Card1_Options.decks = false;
                l2Card1_Options.content = contentURL;
                l2Card1_Options.pageOption = true;

                var l2Card2_Options = {};
                Co.extend(l2Card2_Options, l2Card1_Options);
                l2Card2_Options.name = "l2Card-2";
                l2Card2_Options.decks = true;

                var l3Card_Options = {};
                Co.extend(l3Card_Options, l2Card1_Options);
                l3Card_Options.name = "l3Card-1";
                l3Card_Options.decks = false;

                Co.when(instance.process(request, view)).then(function () {
                    expect(view.subject.cards.length).toBe(1);
                    expect(view.showPage).toBe(undefined);
                    expect(view.selectedOutline).toBe(undefined);
                    expect(footerCard.options).toBeDefined();
                    expect(footerCard.options).toEqual(footerCardOptions);
                    expect(l2Card_1.options).toBeDefined();
                    expect(l2Card_1.options).toEqual(l2Card1_Options);
                    expect(l2Card_2.options).toBeDefined();
                    expect(l2Card_2.options).toEqual(l2Card2_Options);
                    expect(l3Card_1.options).toBeDefined();
                    expect(l3Card_1.options).toEqual(l3Card_Options);
                    expect(l3Card_1.configURL).toEqual(configFormURL);
                }).then(done, done);

            });

            it("sets flag for Drag and Drop across level for master root site enabled webids", function (done) {
                groupService.siteType.andCallFake(function () {
                    return "MASTER_SITE";
                });
                Co.when(instance.process(request, view)).then(function () {
                    expect(view.isDragDropAcrossLevelsForMasterRootSiteEnabled).toBeTruthy();
                    expect(view.siteType).toBe('MASTER_SITE');
                }).then(done, done);
            });

            it("sets parentId on each subcard through updateBodyCards()", function (done) {
                configCtx.page = "AboutFinancing";
                view.subject.cards = [{
                    name: 'main',
                    id: 'view/card/l1',
                    cards: [{
                        id: 'view/card/l2-1',
                        name: 'l2Card1-name',
                        cards: [{
                            id: 'view/card/l3-1',
                            name: 'l3Card1-name'
                        }]
                    }, {
                        id: 'view/card/l2-2',
                        name: 'l2Card2-name'
                    }]
                                      }];
                view.subject.cards.main = view.subject.cards[0];
                Co.when(instance.process(request, view)).then(function (view) {
                    expect(view.subject.cards.main).toBeDefined();
                    expect(view.subject.cards.main.cards[0].parentCardId).toBe('view/card/l1');
                    expect(view.subject.cards.main.cards[1].parentCardId).toBe('view/card/l1');
                    expect(view.subject.cards.main.cards[0].cards[0].parentCardId).toBe('view/card/l2-1');
                }).then(done, done);
            });

            it("show content tile on CMS card when a content record is attached to it", function (done) {
                view.subject.cards.main = view.subject.cards[0];
                view.subject.cards.main.cards[0].subject = {
                    title: 'Content Title'
                };
                Co.when(instance.process(request, view)).then(function (view) {
                    expect(view.subject.cards.main.cards[0].cardContentTitle).toBe('Content Title');
                }).then(done, done);
            });

            it("scrub the markup from content tile and show only text on CMS card", function (done) {
                view.subject.cards.main = view.subject.cards[0];
                view.subject.cards.main.cards[0].subject = {
                    title: "<span class=\"colorspan\" style=\"color:#db5462;\"><u><sup>Content Title</sup></u></span>"
                };
                Co.when(instance.process(request, view)).then(function (view) {
                    expect(view.subject.cards.main.cards[0].cardContentTitle).toBe('Content Title');
                }).then(done, done);
            });

            it("Show first content record title on CMS card when multiple content records attached to it", function (done) {
                view.subject.cards.main = view.subject.cards[0];
                view.subject.cards.main.cards[0].subject = [{
                    title: 'Content Title1'
                }, {
                    title: 'Content Title2'
                }];
                Co.when(instance.process(request, view)).then(function (view) {
                    expect(view.subject.cards.main.cards[0].cardContentTitle).toBe('Content Title1');
                }).then(done, done);
            });

            describe("sets page to migrate", function () {
                it("does not set view.pageToMigrate when there is a main card available in the outline", function (done) {
                    view.subject.cards.main = view.subject.cards[0];
                    Co.when(instance.process(request, view)).then(function () {
                        expect(view.pageToMigrate).toBeUndefined();
                    }).then(done, done);
                });

                it("sets view.pageToMigrate with page name when there is no main subject card and user has Ops Tool auth", function (done) {
                    if (view.subject && view.subject.cards) {
                        delete view.subject.cards[0];
                    }
                    isCobaltUser = true;
                    Co.when(instance.process(request, view)).then(function () {
                        expect(view.pageToMigrate).toEqual(configCtx.page);
                    }).then(done, done);
                });

                it("sets view.pageToMigrate as 'blank' when there is no main subject card and user LACKS Ops Tool auth", function (done) {
                    if (view.subject && view.subject.cards) {
                        delete view.subject.cards[0];
                    }
                    isCobaltUser = false;
                    Co.when(instance.process(request, view)).then(function () {
                        expect(view.pageToMigrate).toEqual('blank');
                    }).then(done, done);
                });
            });

            describe("hydra.use.hero.builder feature toggle", () => {
                beforeEach(function () {
                    view.subject.cards[0].cards[0] = {
                        id: 'view/card/uuid',
                        cardType: "Hero",
                        relName: "heroRel",
                        name: 'iamhero',
                        displayName: 'Hero Wrapper'
                    };
                    configUrlUtil.getConfigCtxAsQueryParam.andReturn("");
                });

                it("does nothing to the cards if feature toggle does not exist", (done) => {
                    delete features["hydra.use.hero.builder"];
                    var expected = {
                        name: 'iamhero',
                        replace: 'cardSelectorModal',
                        add: 'cardSelectorModal',
                        delete: 'properties',
                        decks: false,
                        configCtx: '',
                        properties: 'propertiesModal',
                        style: 'styleModal',
                        admin: 'adminModal',
                        pageOption : false
                    };

                    Co.when(instance.process(request, view)).then(function () {
                        expect(view.subject.cards[0].cards[0].options).toEqual(expected);
                    }).then(done, done);
                });

                it("does nothing to the cards if feature toggle is disabled", (done) => {
                    var expected = {
                        name: 'iamhero',
                        replace: 'cardSelectorModal',
                        add: 'cardSelectorModal',
                        delete: 'properties',
                        decks: false,
                        configCtx: '',
                        properties: 'propertiesModal',
                        style: 'styleModal',
                        admin: 'adminModal',
                        pageOption : false
                    };

                    Co.when(instance.process(request, view)).then(function () {
                        expect(view.subject.cards[0].cards[0].options).toEqual(expected);
                    }).then(done, done);
                });

                it("adds heroBuilder properties if feature toggle is enabled", (done) => {
                    features["hydra.use.hero.builder"].value = true;

                    var expected = {
                        name: 'iamhero',
                        replace: 'cardSelectorModal',
                        delete: 'properties',
                        decks: false,
                        configCtx: '',
                        properties: 'propertiesModal',
                        style: 'styleModal',
                        admin: 'adminModal',
                        heroBuilder: 'route/base-view/heroBuilder?&selectedCardId=view/card/uuid',
                        pageOption : false
                    };

                    Co.when(instance.process(request, view)).then(function () {
                        expect(view.subject.cards[0].cards[0].options).toEqual(expected);
                    }).then(done, done);
                });

                describe("content block v2 feature toggle", function () {
                    it("toggle is disabled", (done) => {
                        Co.when(instance.process(request, view)).then(function () {
                            expect(view.contentBlockName).toBe(undefined);
                        }).then(done, done);
                    });

                    it("toggle is enabled", (done) => {
                        features["hydra.config.contentBlocksV2"].value = true;
                        request.query.fragmentName = "ContentBlockFragmentName";
                        Co.when(instance.process(request, view)).then(function () {
                            expect(view.contentBlockName).toBe(request.query.fragmentName);
                        }).then(done, done);
                    });
                });

            });
            describe("subcards collapsible", function()  {
                var bodyCard;
                beforeEach(function() {
                     bodyCard = {
                        id: 'view/card/32ca20e40ca0',
                        relName: 'main',
                        displayName: 'L1 | Home Page | GM US | "Merchandise"',
                        cards:[{
                            id: 'view/card/uuid1',
                            name: 'iAmL2Card',
                            displayName: 'I am an L2 card',
                            parentCardDisplayName: 'L1 | Home Page | GM US | "Merchandise"',
                            parentCardId: 'view/card/32ca20e40ca0',
                            parentCardName: 'HomePage-Merchandise',
                            cards:[{
                                id: 'view/card/uuidl31',
                                name: 'iAmL2Card',
                                displayName: 'I am an L3 card',
                                cards: [{
                                    id: 'view/card/uuidl41',
                                    name: 'iAmL2Card',
                                    displayName: 'I am an L4 card'
                                }, {
                                    id: 'view/card/uuidl42',
                                    name: 'iAmL2Card',
                                    displayName: 'I am an L4 card'
                                }]
                            }, {
                                id: 'view/card/uuidl32',
                                name: 'iAmL2Card',
                                displayName: 'I am an L3 card'
                            }]
                        }, {
                            id: 'view/card/uuid2',
                            name: 'iamCBChild2',
                            displayName: 'I am an L2 card',
                            parentCardDisplayName: 'L1 | Home Page | GM US | "Merchandise"',
                            parentCardId: 'view/card/32ca20e40ca0',
                            parentCardName: 'HomePage-Merchandise'
                        }]
                    };
                    view.subject.cards[0] = bodyCard;
                });
                it("sets the subcards count", function (done) {
                    Co.when(instance.process(request, view)).then(function () {
                        expect(bodyCard.cards[0].subCardsCount).toEqual(4);
                    }).then(done, done);
                });
                it("adds toggle class if cards collapsible feature toggle is enabled", function (done) {
                    features["hydra.editor.cards.collapse.enabled"].value = true;
                    Co.when(instance.process(request, view)).then(function () {
                        expect(view.cardCollapseStyle).toEqual('cards-collapse');
                    }).then(done, done);
                });
                it("no toggle class if cards collapsible feature toggle is disabled", function (done) {
                    features["hydra.editor.cards.collapse.enabled"].value = false;
                    Co.when(instance.process(request, view)).then(function () {
                        expect(view.cardCollapseStyle).toBeUndefined();
                    }).then(done, done);
                });
            });

        });
    });

});
