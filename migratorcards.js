/*globals Co, sb, console*/
/*jshint browser: true */
(function () {
    "use strict";
    "import sb.util.submissionconfirmer, Co.context.configCtx, sb.migrator.storage, sb.migrator.card, sb.migrator.sendchunks, Co.service.remote.i18n";

    /**
     * Directive Landing Page Migration Tool cardBuilder
     */
    sb.directive("migratecards", function (contextService, confirmer, storageObject, cardObject, sendChunksUtil, i18nService) {

        var Migrator = this;

        var FORM_CHECKLIST_CLASS = 'migrationChecklist';
        var FORM_STAFF_CLASS = 'contentStaff';

        var HIDING_CLASS = 'hidden';
        var SELECTING_CLASS = 'selected';
        var WIP_LIST_CONTAINER = 'cardQueue';
        var WIP_LIST_COMPLETED_CLASS = 'completed';
        var WIP_CHECKLIST_MULTIPLE_CLASS = 'multiple';
        var confirmationPrompt; // assigned during init, below

        var MEDIA_FORM = 'media';
        var LINK_FORM = 'link';
        var MEDIA_FORM_FIELD_INPUT = '';
        var LINK_FORM_FIELD_INPUT = '';

        // Migration properties, methods
        Migrator.host = document.location.protocol + '//' + document.location.host;
        Migrator.route = 'route/base-view/cards';

        // For figuring out the image fields for submission
        Migrator.imageIndex = 0;
        Migrator.cardCount = 0;

        Migrator.init = function (element, options) {
            var me = this;

            this.options = options;
            this.setOptions();

            // Media Flag
            this.creatingNewMedia = false;

            this.domain = element.dataset.domain;

            element.addEventListener('load', function () {
                me.container = element.contentDocument;
                me.preview = document.querySelector('[name=viewer]');

                // Elements
                me.title = me.container.querySelector('.title h1');

                me.contentTypeDropdown = me.container.querySelector('.cardBuilder .type-list');

                me.urlHeader = me.container.querySelector('.cardBuilder .urlHeader');
                me.contentTypeHeader = me.container.querySelector('.cardBuilder .contentTypeHeader');
                me.contentListHeader = me.container.querySelector('.cardBuilder .contentListHeader');

                me.actionBtn = me.container.querySelector('.migrationChecklist [name=submit]');
                me.updateBtn = me.container.querySelector('.migrationChecklist [name=update]');
                me.backBtn = me.container.querySelector('.migrationChecklist [name=back]');
                me.cancelBtn = me.container.querySelector('.cardBuilder [name=cancel]');
                me.deleteBtn = me.container.querySelector('.migrationChecklist [name=delete]');
                me.migrateBtn = me.container.querySelector('.cardBuilder [name=migrate]');

                me.queueFootnote = me.container.querySelector('.cardBuilder .footnote');

                me.cardContainer = me.container.querySelector('.' + WIP_LIST_CONTAINER);

                me.addMediaTitleSubmit = me.container.querySelector('.contentQueue .addSubForm.mediaForm .addMediaTitleSubmit');
                me.addMediaTitleCancel = me.container.querySelector('.contentQueue .addSubForm.mediaForm .addMediaTitleCancel');

                me.addLinkActivator = me.container.querySelector('.contentQueue .addNewLink');
                me.addLinkCancel = me.container.querySelector('.contentQueue .addSubForm.linkForm .addLinkCancel');
                me.addLinkSubmit = me.container.querySelector('.contentQueue .addSubForm.linkForm .addLinkSubmit');


                // Get context info
                me.configCtx = grabJSON(decodeURI(me.container.URL));

                me.storage = storageObject.setup(me.configCtx);

                // Store objects
                me.pageWip = me.storage.pageWip;

                if (!me.wipCard) {
                    me.resetWip();
                }

                Co.when(i18nService.translate({
                    titlePrefix: "MigrationToolView.cardBuilder.titles.titlePrefix",
                    titleSuffix: "MigrationToolView.cardBuilder.titles.titleSuffix",
                    title: "MigrationToolView.cardBuilder.titles.contentQueueTitle",
                    subtitle: "MigrationToolView.cardBuilder.titles.contentQueueSubTitle",
                    copy: "MigrationToolView.cardBuilder.titles.contentQueueCopy",
                    media: "MigrationToolView.cardBuilder.titles.contentQueueMedia",
                    link: "MigrationToolView.cardBuilder.titles.contentQueueLink",
                    invalidSelection: "MigrationToolView.cardBuilder.labels.invalidSelection",
                    defaultImgTitle: "MigrationToolView.previewContainer.defaultImgTitle",
                    couldNotImport: "MigrationToolView.previewContainer.errors.couldNotImport",
                    maxImportableIs: "MigrationToolView.previewContainer.errors.maxImportableIs",
                    thisFileSizeIs: "MigrationToolView.previewContainer.errors.thisFileSizeIs",
                    submitting: "MigrationToolView.submissionConfirmer.statusMessages.submitting",
                    howMany: "MigrationToolView.submissionConfirmer.statusMessages.howMany",
                    validating: "MigrationToolView.cardBuilder.labels.validating"
                })).then(function (results) {
                    if (!me.isExternal) {
                        me.loadViewerPane();
                    }
                    me.loadInitial(results);
                    me.updateTitle(results);
                    me.translationData = results;

                    // More UI setup
                    confirmationPrompt = confirmer.please(handleContentMigrate.bind(me), successRedirect.bind(me), {
                        "abandon": function () {
                            me.storage.setSaved('delete');
                        },
                        sendChunks: me.sendChunks,
                        translationData: results
                    });
                    me.initButtons();
                    me.toggleSaveUpdate();
                }).fail(function (err) {
                    console.error("Failed to get I18N translations", err);
                });

                // Bind a listener for postMessages
                window.top.addEventListener('message', me.messageRouter.bind(me), false);

                // Managing which step(s) is/are initially displayed.
                if (me.isExternal) {
                    hide(me.contentTypeDropdown);
                } else {
                    hide(me.contentListHeader);
                }

                me.options = me.container.querySelectorAll('.cardBuilder .type-list .contentType');

                Array.prototype.forEach.call(me.options, function (el) {
                    el.addEventListener('click', me.contentTypeCustomHandler.bind(me));
                });

                [me.addLinkActivator, me.addLinkCancel].forEach(function (link) {
                    link.addEventListener('click', function (evt) {
                        evt.preventDefault();
                        me.showSubForm(true, LINK_FORM);
                    });
                });

                me.addLinkSubmit.addEventListener('click', function (evt) {
                    evt.preventDefault();
                    me.validateNewLink();
                });

                me.addMediaTitleSubmit.addEventListener('click', me.createNewMedia.bind(me));

                me.addMediaTitleCancel.addEventListener('click', me.handleContentCancel.bind(me));


                Array.prototype.forEach.call(me.container.querySelectorAll(".contentQueue .addSubForm.linkForm .radio"), function (radio) {
                    radio.addEventListener("click", function (evt) {
                        me.addLinkRadioValidator(evt.currentTarget);
                    });
                });

                if (me.pageWip.contentType) {
                    me.setCustomDd(me.pageWip.contentType);
                    show(me.contentListHeader);
                }
            });
        };

        Migrator.updateTitle = function(obj) {
            var me = this;
            var page = obj.titlePrefix || "Landing Page";
            var action = obj.titleSuffix || "migration";
            this.title.innerText = (me.configCtx.page || page) + ' ' + action;
        };

        Migrator.loadViewerPane = function loadViewerPane() {
            var viewerFrame = document.querySelector('iframe.viewer');
            var configCtx = contextService.fetch();
            var domain = this.domain;
            if (!domain) {
                domain = 'Tetra domain not found.'; // This will appear as part of the 404'd URL message in the consumer window, helping surface the error.
                console.error(domain + " You might be running localhost Hydra, in which case the consumer page (at least) won't show.");
            }
            var concatter = domain.slice(-1) == '/' ? '' : '/';
            var path = "index.do?webId=" + configCtx.webId + "&locale=" + configCtx.locale + "&pageName=" + configCtx.page + "&nextGen=false&disableAutofill=true";
            var url = domain + concatter + path;
            viewerFrame.src = url;
        };

        /*  TODO: break these few methods out into Custom Dropdown Directive
            Once I figure out how to pass values back/forth to this directive
         */
        Migrator.setCustomDd = function (value) {
            this.contentTypeHeader.classList.remove('active');
            this.contentTypeHeader.classList.add('complete');
            this.contentListHeader.classList.add('active');

            Array.prototype.forEach.call(this.options, function (opt) {
                opt.classList.remove(HIDING_CLASS);
                opt.classList.remove(SELECTING_CLASS);

                if (opt.dataset.value === value) {
                    opt.classList.add(SELECTING_CLASS);
                } else {
                    opt.classList.add(HIDING_CLASS);
                }
            });
        };

        Migrator.validateNewLink = function validateNewLink() {
            var addLinkForm = this.container.querySelector('.contentQueue .addSubForm.linkForm');

            var urlType;
            var urlElem;
            var labelElem;
            var widgetIdElem = addLinkForm.querySelector('input[name="widgetId"]');
            var msg = {
                data: {
                    action: "create",
                    content: {},
                    source: "migrationTool",
                    target: "editor",
                    type: "link",
                    widgetId: "",
                    linkBuilder: true
                }
            };

            addLinkForm.querySelectorAll('input[name="url-type"]').forEach(function (button) {
                if (button.checked) {
                    urlType = button.value;
                }
            });

            if (urlType === 'pageOnSite') {
                urlElem = addLinkForm.querySelector('[name="page-name"]');
            } else {
                urlElem = addLinkForm.querySelector('[name="custom-url"]');
            }

            labelElem = addLinkForm.querySelector('[name="link-title"]');

            msg.data.content.label = labelElem.value;
            msg.data.content.name = labelElem.value;
            msg.data.content.url = urlElem.value;
            msg.data.widgetId = widgetIdElem.value || generateId();

            if (urlElem.checkValidity() && labelElem.checkValidity()) {
                this.create(msg);
                this.showSubForm(false, LINK_FORM);
            }

        };

        Migrator.addLinkRadioValidator = function addLinkRadioValidator(elem) {
            Array.prototype.forEach.call(this.container.querySelectorAll('.contentQueue .addSubForm.linkForm .radio'), function (radio) {
                var radioInput = radio.querySelector('input[type="radio"]');
                radioInput.checked = false;
                Array.prototype.forEach.call(radio.querySelectorAll('input:not([type="radio"]),select'), function (input) {
                    if (!elem.contains(input)) {
                        input.disabled = true;
                    }
                });
            });
            elem.querySelector('input[type="radio"]').checked = true;
            Array.prototype.forEach.call(elem.querySelectorAll('input:not([type="radio"]),select'), function (input) {
                input.disabled = false;
            });
        };

        Migrator.populateCustomLink = function populateCustomLink(data) {
            var addLinkForm = this.container.querySelector(".contentQueue .addSubForm.linkForm");
            var elem = addLinkForm.querySelector(".radio.customUrl");
            this.addLinkRadioValidator(elem);
            elem.querySelector('input[name="custom-url"]').value = data.content.url;
            addLinkForm.querySelector('input[name="link-title"]').value = data.content.label;
            addLinkForm.querySelector('input[name="widgetId"]').value = data.widgetId;
        };

        Migrator.contentTypeCustomHandler = function (e) {
            /* If departmentCard type, don't let the user change */
            if (this.pageWip.contentType && this.pageWip.contentType === "departmentCard") {
                return;
            }

            var self = this;
            var target = e.currentTarget;
            var val = target.dataset.value;

            if (target.classList.contains(SELECTING_CLASS)) {
                Array.prototype.forEach.call(this.options, function (opt) {
                    if (!opt.classList.contains(SELECTING_CLASS)) {
                        opt.classList.toggle(HIDING_CLASS);
                    }
                });
            } else {
                self.setCustomDd(val);
                this.pageWip.contentType = val;
                this.storage.setSaved();
                show(this.contentListHeader);
            }
            this.notify('initialize', {
                contentType: val || null,
                i18n: self.translationData // Do we need a default value here?
            });
        };
        /*  End Custom Dropdown Directive methods */

        Migrator.loadInitial = function loadInitial(i18n) {
            var self = this;
            var page = this.storage.getPage();
            if (page) {
                this.notify('initialize', {
                    contentType: page.contentType || null,
                    i18n: i18n || self.translationData
                });
                this.notify('resume', page.toPreviewJson());

                this.buildCardList(page.protoCards);
            }
        };

        Migrator.messageRouter = function (msg) {
            if (msg.data && msg.data.target === 'editor') {
                var action = msg.data.action;

                if (msg.data.source === 'migrationTool') {
                    if (typeof this[action] === 'function') {
                        this[action](msg);
                    }
                } else if (msg.data.source === 'staffMigrator') {
                    if (typeof this[action + 'Wip'] === 'function') {
                        this[action + 'Wip'](msg.data.data);
                    }
                }
            }
        };

        Migrator.initButtons = function () {
            var me = this;

            var checklistFields = this.container.querySelectorAll('.migrationChecklist li span');

            Array.prototype.forEach.call(checklistFields, function (el) {
                el.addEventListener('click', me.handleContentItemDelete.bind(me));
            });

            this.actionBtn.addEventListener('click', this.handleContentSave.bind(me));
            this.updateBtn.addEventListener('click', this.handleContentUpdate.bind(me));
            this.backBtn.addEventListener('click', this.handleContentBack.bind(me));
            this.deleteBtn.addEventListener('click', this.handleContentDelete.bind(me));
            this.migrateBtn.addEventListener('click', confirmationPrompt.submission.bind(confirmationPrompt));
            this.cancelBtn.addEventListener('click', confirmationPrompt.abandonment.bind(confirmationPrompt));
            this.cardContainer.addEventListener('sortCardscomplete', this.handleContentSortCards.bind(me))
        };

        Migrator.toggleSaveUpdate = function (action) {
            if (action && action === 'update') {
                this.actionBtn.style.display = 'none';
                this.updateBtn.style.display = 'inherit';
            } else {
                this.actionBtn.style.display = 'inherit';
                this.updateBtn.style.display = 'none';
            }
        };

        Migrator.handleContentBack = function (e) {
            e.preventDefault();

            this.notify('remove', this.wipCard.toPreviewJson());

            var stored = this.container.querySelector('.migrationChecklist [name=wipCard]').value;
            if (stored) {
                var originalCard = cardObject.fromJSON(stored);

                this.notify('resume', originalCard.toPreviewJson());
            }

            this.resetWip();

            this.closeChecklist();

            this.creatingNewMedia = false;
        };

        Migrator.handleContentCancel = function (e) {
            e.preventDefault();

            var widgets = this.wipCard.widgets;
            var lastWidget = widgets[widgets.length - 1];

            this.wipCard.deleteWidget(lastWidget);
            this.notify('remove', {
                "wrapper": {},
                "items": [lastWidget]
            });
            this.showSubForm(true, MEDIA_FORM);
            this.creatingNewMedia = false;
        };

        Migrator.handleContentDelete = function (e) {
            e.preventDefault();

            var card = this.wipCard;

            // TODO: Confirm delete first
            this.deleteWip(card);

            this.storage.getPage();

            this.closeChecklist();

            this.notify('remove', card.toPreviewJson());

            this.creatingNewMedia = false;
        };

        Migrator.handleContentItemDelete = function (e) {
            var item = e.target.tagName === "LI" ? e.target : e.target.closest("li");
            if (!item.dataset.widget) {
                return;
            }
            var wipWidget = JSON.parse(item.dataset.widget);

            this.wipCard.deleteWidget(wipWidget);

            this.updateChecklistTitle(this.parseContentTitle(this.wipCard));

            // Update UI to show deletion
            // If one of many - delete
            var type = item.dataset.type; // ex: media || link
            var selector = '.' + type + 'Field';
            var siblings = item.parentElement.querySelectorAll(selector);

            if (['copy', 'media', 'link'].indexOf(type) !== -1 && siblings.length > 1) {
                var list = item.parentNode;

                list.removeChild(item);
                list.querySelector(selector).classList.remove(WIP_CHECKLIST_MULTIPLE_CLASS);
            } else {
                item.classList.remove(WIP_LIST_COMPLETED_CLASS);
                this.setChecklistPreview(item);
            }

            this.notify('remove', {
                "wrapper": {},
                "items": [wipWidget]
            });
        };

        Migrator.handleContentSave = function (e) {
            e.preventDefault();

            if (this.creatingNewMedia) {
                console.error('Media title must be submitted before record can be created');
            } else if (this.wipCard.widgets.length > 0) {
                this.saveWip(this.wipCard);

                this.notify('save', this.wipCard.toPreviewJson());

                this.cardCount += 1;
                this.resetWip();
                this.closeChecklist();
            } else {
                this.deleteWip(this.wipCard);

                this.storage.getPage();
                this.closeChecklist();
            }
        };

        Migrator.handleContentSortCards = function(e){
            var pageCards = this.pageWip.protoCards;
            var data = e.detail.data;
            var sortedPageCards = [];
            data.sort(function compareSortOrder(item1,item2){
                return item1.sortedOrder - item2.sortedOrder;
            });
            for(var i =0; i < pageCards.length; i++){
                var index = data[i].cardIndex;
                if(pageCards[index]){
                    sortedPageCards[i] = pageCards[index];
                }
            }
            this.pageWip.updateCard(sortedPageCards);
            this.storage.setSaved();

        };

        /**
         * Ajax form submission function. This is declared here as an independent function so that the reference gets established
         * before module init, so that init method can use it. The module prototype gets it attached anyway, below this function
         * definition.
         * @param [event]
         */
        function handleContentMigrate(event) {
            var me = this;

            if (event) { // This condition means we can call this method either from UI listener or directly.
                event.target.setAttribute('disabled', 'disabled');
                event.preventDefault();
            }

            var url = this.buildUrl(this.pageWip);
            var data = this.prepareMigrationJson(this.pageWip);
            var request = new XMLHttpRequest();

            me.dataItems = data.items;

            if (me.sendChunks) {
                sendChunksUtil.create(me, confirmationPrompt);
                sendChunksUtil.processRequests();
            } else {
                sendAll(me, url, request, data);
            }
        }

        function sendAll(me, url, request, data) {
            request.open('POST', url, true);
            request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            request.onerror = function () {
                console.warn("Could not connect to get Content Types");
                confirmationPrompt.submissionFailureUX();
            };
            request.onload = function () {
                if (request.status >= 200 && request.status < 400) {
                    console.log("Successfully migrated (status " + request.status + ")");
                    // What are we going to get back in the response and what do we do with it?
                    me.storage.setSaved('delete');
                    confirmationPrompt.submissionSuccessUX();
                } else if (request.status == 500 && request.statusText == 'Internal Server Error') {
                    // have this as fallback if there is timeout error from server
                    if (request.response && request.response.querySelector('body').innerText.indexOf('Read timed out') >= -1) {
                        setTimeout(confirmationPrompt.submissionSuccessUX.bind(confirmationPrompt), 10000);
                    } else {
                        confirmationPrompt.submissionFailureUX();
                    }
                } else {
                    console.warn("Content could not be migrated: status " + request.status);
                    confirmationPrompt.submissionFailureUX();
                }
            };
            //encode data before sending - else form data will break
            data = encodeURIComponent(JSON.stringify(data));
            request.send("data=" + data);
        }

        // Attach function reference to module prototype.
        Migrator.handleContentMigrate = handleContentMigrate;

        /**
         * Function declared independently so that the reference gets established before module init. Module
         * prototype gets it attached below this function definition.
         *
         * @param [event]
         */
        function successRedirect() {
            return this.goToEditorViaTetraWsm();
        }
        Migrator.successRedirect = successRedirect;

        /**
         * Make the whole WSM (re)load with the current page from configCtx.
         */
        Migrator.goToEditorViaTetraWsm = function () {

            var configCtx = contextService.fetch();
            var pageName = configCtx.page;
            if (!pageName) {
                console.error("No target page found for redirection in goToEditorViaTetraWsm");
                window.history.back();
            } else {
                var newPageParam = "pageName=" + pageName;
                var currentParams = window.top.location.search;
                var rgx = /pageName=[^&]+/; // to find "pageName=..." before next '&' or end of string

                // Include our target page in the WSM's URL query, overwriting or appending as appropriate.
                var newParams = currentParams.match(rgx) ? currentParams.replace(rgx, newPageParam) : currentParams + '&' + newPageParam;

                // Now go there. (By changing the search, the URL changes so navigation happens.)
                window.top.location.search = newParams;
            }
        };

        Migrator.handleContentUpdate = function (e) {
            e.preventDefault();

            if (this.wipCard.widgets.length > 0) {
                this.notify('save', this.wipCard.toPreviewJson());
                this.updateWip(this.wipCard);
                this.resetWip();
            } else {
                this.deleteWip(this.wipCard);
                this.storage.getPage();
            }

            this.closeChecklist();
        };

        Migrator.resetWip = function () {
            this.wipCard = cardObject.setup([this.configCtx.webId, this.configCtx.page, generateId(), this.cardCount].join('-'));
        };

        Migrator.saveWip = function (wipCard) {
            this.pageWip.addCard(wipCard, this.migratedPage);
            this.storage.setSaved();

            this.buildCardList(this.pageWip.protoCards);
        };

        Migrator.updateWip = function (wipCard) {
            this.pageWip.updateCard(wipCard);
            this.storage.setSaved();

            this.buildCardList(this.pageWip.protoCards);
        };

        Migrator.deleteWip = function (wipCard) {
            this.pageWip.deleteCard(wipCard);
            this.storage.setSaved();

            this.resetWip();
            this.buildCardList(this.pageWip.protoCards);
        };

        Migrator.promoteWip = function (wipCard) {
            this.pageWip.promoteCard(wipCard);
            this.storage.setSaved();

            this.buildCardList(this.pageWip.protoCards);
        };

        Migrator.labelPrimaryCard = function (l1) {
            var l1Class = 'mainL1';
            var cards = this.container.querySelectorAll('.cardBuilder li');

            Array.prototype.forEach.call(cards, function (c) {
                c.classList.remove(l1Class);
            });

            l1.classList.add(l1Class);
        };

        Migrator.buildWipIcon = function (data) {
            var me = this;
            var card = data;
            var icon = document.createElement('li');
            var text = document.createElement("span");
            text.classList.add("text");
            text.innerText = this.parseContentTitle(card) + ' [' + card.widgets.length + ']'; // Some extra meta info here
            icon.dataset.card = JSON.stringify(card);
            icon.appendChild(text);

            if (this.pageWip.contentType !== 'departmentCard' && !this.migratedPage) {
                var star = document.createElement('span');

                star.classList.add("star");
                star.addEventListener('click', function (e) {
                    e.stopPropagation();

                    var target = e.target;
                    var parent = target.parentElement;
                    var cardJson = parent.dataset.card;

                    me.promoteWip(JSON.parse(cardJson));
                    var container = me.cardContainer;
                    var firstChild = container.firstElementChild;
                    firstChild && container.prepend(parent);
                    var index = container.children.indexOf(parent);
                    container.children.splice(index,1);
                    parent.setAttribute('draggable',false);
                });

                icon.appendChild(star);
            }

            icon.addEventListener('click', function (e) {
                var target = e.target.tagName === "LI" ? e.target : e.target.closest("li");
                var cardJson = target.dataset.card;

                // Replace wipCard
                me.wipCard = null;
                me.loadCardFromJson(cardJson);

                if (me.wipCard.widgets[0].type === 'staff') {
                    //  Post message to migrateStaff directive
                    var content = {
                        "source": "migrationTool",
                        "target": "staffMigrator",
                        "action": "updateCard",
                        "content": me.wipCard
                    };

                    window.top.postMessage(content, '*');

                    me.showForm(FORM_STAFF_CLASS, true);
                } else {
                    // Show current widgets
                    me.populateChecklist(me.wipCard.widgets);
                    me.updateChecklistTitle(me.parseContentTitle(me.wipCard));
                    me.updateCheckListCard(me.wipCard);
                    me.showForm(FORM_CHECKLIST_CLASS, true);

                    // change button action to update
                    me.toggleSaveUpdate('update');
                }
            });

            return icon;
        };

        Migrator.loadCardFromJson = function (json) {
            // Save a reference to the card that we are working on
            this.wipCard = cardObject.fromJSON(json);

            this.notify('update', this.wipCard.toPreviewJson());
        };

        Migrator.closeChecklist = function () {
            this.resetChecklist();
            this.showForm(FORM_CHECKLIST_CLASS);
            this.toggleSaveUpdate();
        };

        Migrator.showForm = function (targetClass, bool) {
            // TODO: See if there's an existing directive that takes care of this
            targetClass = targetClass || FORM_CHECKLIST_CLASS;
            var target = this.container.querySelector('.' + targetClass);
            var visibleClass = 'open';
            if (target && bool) {
                target.classList.add(visibleClass);
            } else {
                target.classList.remove(visibleClass);
                this.showSubForm(false, LINK_FORM);
                this.showSubForm(false, MEDIA_FORM);
            }
        };

        Migrator.showSubForm = function (openForm, formType) {
            var formSelector, inputSelectors, inputValue;

            if (formType === MEDIA_FORM) {
                formSelector = this.container.querySelector('.contentQueue .addMediaTitleField');
                inputSelectors = 'input[type="text"]';
                inputValue = MEDIA_FORM_FIELD_INPUT;

                this.setFieldInput(formSelector, inputSelectors, inputValue);
                this.toggleForm(formSelector, openForm);
            } else {
                // LINK_FORM
                formSelector = this.container.querySelector('.contentQueue .addSubForm.linkForm');
                inputSelectors = 'input[type="text"], input[type="hidden"]';
                inputValue = LINK_FORM_FIELD_INPUT;

                this.toggleLinkButton(openForm);
                this.setFieldInput(formSelector, inputSelectors, inputValue);
                this.selectPageElement(formSelector);
                this.toggleForm(formSelector, openForm);
            }
        };

        Migrator.setFieldInput = function setFieldInput(formSelector, inputSelectors, inputValue) {
            Array.prototype.forEach.call(formSelector.querySelectorAll(inputSelectors), function (e) {
                e.value = inputValue;
            });
        };

        Migrator.toggleForm = function toggleForm(formSelector, openForm) {
            formSelector.classList[openForm ? "toggle" : "add"](HIDING_CLASS);
        };

        Migrator.toggleLinkButton = function toggleButton(openForm) {
            this.addLinkActivator.classList[openForm ? "toggle" : "remove"](HIDING_CLASS);
        };

        Migrator.selectPageElement = function selectListElement(formSelector) {
            formSelector.querySelector('[name="page-name"]').selectedIndex = 0;
        };

        Migrator.resetChecklist = function () {
            var me = this;
            var fields = this.container.querySelectorAll('.migrationChecklist li');

            this.updateChecklistTitle('Content');
            this.updateCheckListCard();

            Array.prototype.forEach.call(fields, function (el) {
                if (el.classList.contains(WIP_LIST_COMPLETED_CLASS)) {
                    el.classList.remove(WIP_LIST_COMPLETED_CLASS);
                }
                if (el.classList.contains(WIP_CHECKLIST_MULTIPLE_CLASS)) {
                    el.parentNode.removeChild(el);
                }
                el.dataset.widgetId = '';
                el.dataset.widget = '';
                me.setChecklistPreview(el);
            });
        };

        Migrator.updateChecklistTitle = function (str) {
            var title = this.container.querySelector('.migrationChecklist h2');

            if (title) {
                title.innerText = str.length > 30 ? str.substring(0, 30) + '...' : str;
            }
        };

        Migrator.updateCheckListCard = function (json) {
            var input = this.container.querySelector('.migrationChecklist [name=wipCard]');

            input.value = json ? JSON.stringify(json) : '';
        };

        Migrator.dePopulateChecklist = function (widget) {
            var item = this.container.querySelector('.migrationChecklist .contentQueue [data-widget-id=' + widget.widgetId + ']');
            var me = this;
            var type = item.dataset.type;
            var selector = '.' + type + 'Field';
            var siblings = item.parentElement.querySelectorAll(selector);

            if (['copy', 'media', 'link'].indexOf(type) !== -1 && siblings.length > 1) {
                var list = item.parentNode;

                list.removeChild(item);
                list.querySelector(selector).classList.remove(WIP_CHECKLIST_MULTIPLE_CLASS);
            } else {
                item.classList.remove(WIP_LIST_COMPLETED_CLASS);
                item.dataset.widgetId = '';
                item.dataset.widget = '';
                me.setChecklistPreview(item);
            }
        };

        Migrator.setChecklistPreview = function (el, widget) {
            var target = el;
            if (!target.querySelector('.text')) {
                return;
            }
            var newVal = target.querySelector('.text').innerText.split(' - ')[0];

            if (widget) {
                newVal += ' - ' + (widget.content.text || widget.content.label || widget.content.altText);
            }

            target.querySelector('.text').innerText = newVal;
        };

        Migrator.populateChecklist = function (widget) {
            var me = this;
            var wid = widget;
            var list = this.container.querySelector('.migrationChecklist .contentQueue');

            function manageMultiples(widget) {
                var field = sanitize(widget.type);

                if ((field === 'link' || field === 'media' || field === 'copy' || field === 'subtitle')) {
                    var fields = list.querySelectorAll('.' + field + 'Field');
                    var lastField = fields[fields.length - 1];

                    if (lastField.classList.contains('completed')) {
                        // clone the field
                        var newField = lastField.cloneNode(true);
                        newField.classList.add(WIP_CHECKLIST_MULTIPLE_CLASS);
                        newField.classList.remove('completed');

                        var clone = lastField.parentNode.insertBefore(newField, lastField.nextSibling);

                        clone.addEventListener('click', me.handleContentItemDelete.bind(me));
                    }
                }
            }

            function checkMe(widget) {
                var wid = widget;
                var field = sanitize(wid.type);
                var fields = list.querySelectorAll('.' + field + 'Field');
                var fieldEl = fields[fields.length - 1];

                fieldEl.classList.add(WIP_LIST_COMPLETED_CLASS);
                fieldEl.dataset.widgetId = wid.widgetId;
                fieldEl.dataset.widget = JSON.stringify(wid);
                fieldEl.dataset.type = field;
                me.setChecklistPreview(fieldEl, wid);
            }

            function sanitize(type) {
                var field = type;

                if (['image', 'video'].indexOf(field) !== -1) {
                    field = 'media';
                } else if (['title', 'subtitle', 'copy', 'media', 'link'].indexOf(field) === -1) {
                    field = 'copy';
                }

                return field;
            }

            if (Array.isArray(wid)) {
                var els = [];
                Array.prototype.forEach.call(wid, function (el) {
                    els.push(el);
                    manageMultiples(el);
                    checkMe(el);
                });
            } else {
                manageMultiples(wid);
                checkMe(wid);
            }
        };

        Migrator.buildCardList = function (cards) {
            var me = this;
            var container = this.cardContainer;
            var count = 0;
            var isStaff = this.pageWip.contentType === 'departmentCard';

            container.innerHTML = '';

            if (!Array.isArray(cards)) {
                cards = [cards];
            }

            Array.prototype.forEach.call(cards, function (card, i) {
                var icon = me.buildWipIcon(card);
                count += 1;
                icon.dataset.sortorder = i;
                container.appendChild(icon);

                if (!isStaff && (i === 0 || card.primary)) {
                    me.labelPrimaryCard(icon);
                }
            });

            //  Activate Migrate button if there are cards
            //  Also - L1 footnote element
            if (count > 0) {
                this.migrateBtn.removeAttribute('disabled');
                !isStaff && !me.migratedPage ? this.queueFootnote.classList.remove(HIDING_CLASS) : this.queueFootnote.classList.add(HIDING_CLASS);
                this.contentListHeader.classList.add('complete');
                this.contentListHeader.classList.remove('active');
            } else {
                this.migrateBtn.setAttribute('disabled', 'disabled');
                this.queueFootnote.classList.add(HIDING_CLASS);
                this.contentListHeader.classList.remove('complete');
                this.contentListHeader.classList.add('active');
            }
        };

        Migrator.create = function (msg) {
            this.wipCard.addWidget(msg.data);

            if (!this.creatingNewMedia) {
                if (msg.data.type === "staff") {
                    var newData = Object.assign({}, msg.data);

                    // Modifying copy of the data and sending a message off to the migrateStaff directive for the form
                    newData.source = "migrationTool";
                    newData.target = "staffMigrator";

                    window.top.postMessage(newData, '*');

                    this.showForm(FORM_STAFF_CLASS, true);
                } else {
                    if (msg.data.type === "link" && !msg.data.linkBuilder) {
                        this.showSubForm(true, LINK_FORM);
                        this.populateCustomLink(msg.data);
                        this.wipCard.deleteWidget(msg.data);
                    } else if (msg.data.type === "media" && this.sendChunks) {
                        this.creatingNewMedia = true;
                        MEDIA_FORM_FIELD_INPUT = msg.data.content.imageName;
                        this.showSubForm(true, MEDIA_FORM);
                    } else {
                        this.populateChecklist(msg.data);
                        this.updateChecklistTitle(this.parseContentTitle(this.wipCard));
                    }
                    this.showForm(FORM_CHECKLIST_CLASS, true);
                }
            } else {
                console.error('Media title must be submitted before any new content can be selected');
                this.removeIllegalContent();
            }
        };

        Migrator.removeIllegalContent = function () {
            var widgets = this.wipCard.widgets;
            var lastWidget = widgets[widgets.length - 1];

            this.wipCard.deleteWidget(lastWidget);
            this.notify('remove', {
                "wrapper": {},
                "items": [lastWidget]
            });
        };

        Migrator.createNewMedia = function (evt) {
            evt.preventDefault();

            var title = this.container.querySelector('.addSubForm.mediaForm [name="media-title"]').value;

            if (title) {
                var widgets = this.wipCard.widgets;
                var lastWidget = widgets[widgets.length - 1];

                lastWidget.content.altText = title;
                lastWidget.content.imageName = title;

                this.populateChecklist(lastWidget);
                this.updateChecklistTitle(title);
                this.showSubForm(false, MEDIA_FORM);
                this.creatingNewMedia = false;
            } else {
                console.error('Media title must be provided');
            }
        };

        Migrator.edit = function (msg) {
            if (this.wipCard.deleteWidget(msg.data)) {
                this.dePopulateChecklist(msg.data);
            }

            this.create(msg);
        };

        Migrator.loaded = function () {
            this.loadInitial();

            if (this.isExternal) {
                show(this.contentTypeDropdown);
                this.urlHeader.classList.remove("active");
                this.urlHeader.classList.add("complete");
            }
        };

        // Take the persistence object we're using and convert it to specific input format for POST
        Migrator.prepareMigrationJson = function (json) {
            var me = this;
            var postJson = {
                "items": []
            };
            var type = json.contentType;
            var protoCards = json.protoCards;

            Array.prototype.forEach.call(protoCards, function (proto) {
                var card = (type === 'departmentCard') ? me.staffToCards(proto) : me.widgetsToCards(proto);
                postJson.items.push(card);
            });

            return postJson;
        };

        Migrator.widgetsToCards = function (obj) {
            var card = {
                "type": this.pageWip.contentType,
                "primary": obj.primary,
                "media": {
                    "category": "primaryImages"
                }
            };

            card.displayName = this.parseContentTitle(obj);
            card.title = this.parseContentTitle(obj);
            card.subtitle = this.parseContentSubtitle(obj);
            card.copy = this.parseContentCopy(obj);
            card.hyperlinks = {
                primary: [] // Assuming for now that we're not worrying about type of link
            };

            // Images are relatively easier
            card.media.images = this.parseContentTypes('media', obj);

            // Links should be like images
            card.hyperlinks.primary = this.parseContentTypes('link', obj);

            return card;
        };

        Migrator.staffToCards = function (obj) {
            return this.parseStaffObject(obj.widgets);
        };

        Migrator.parseStaffObject = function (widgets) {
            // Assumes we're working with staff widget types
            var staff = {
                "firstName": "",
                "lastName": "",
                "department": "",
                "title": "",
                "manager": "false",
                "email": "",
                "phone": "",
                "bio": "",
                "image": ""
            };

            Array.prototype.forEach.call(widgets, function (wid) {
                if (wid.type === "staff" && wid.field) {
                    staff[wid.field] = wid.content.text || wid.content.url || '';
                }
            });

            return staff;
        };

        Migrator.parseContentTitle = function (card) {
            var widgets = card.widgets;
            var title = '';
            var altTitle1 = '';
            var altTitle2, altTitle3, altTitle4; // Hierarchy of alternatives

            if (widgets[0] && widgets[0].type === 'staff') {
                var staff = this.parseStaffObject(widgets);

                return staff.firstName + ' ' + staff.lastName;
            }

            Array.prototype.forEach.call(widgets, function (wid) {
                if (wid.type === 'title') { // If there's more than one title, then we're just concatenating
                    title += ' ' + htmlEscape(wid.content.text);
                }
                // Fallback strings
                if (wid.type === 'subtitle') {
                    altTitle1 = htmlEscape(wid.content.text);
                } else if (wid.type === 'copy') {
                    altTitle2 = htmlEscape(wid.content.text.substring(0, 30)); // Not sophisticated at all
                } else if (wid.type === 'media') {
                    altTitle3 = htmlEscape(wid.content.imageName);
                } else if (wid.type === 'link') {
                    altTitle4 = htmlEscape(wid.content.name);
                }
            });

            return title.trim() || altTitle1.trim() || altTitle2 || altTitle3 || altTitle4 || '';
        };

        Migrator.parseContentSubtitle = function (card) {
            var widgets = card.widgets;
            var title = '';

            Array.prototype.forEach.call(widgets, function (wid) {
                if (wid.type === 'subtitle') {
                    title += ' ' + wid.content.text;
                }
            });

            return title.trim();
        };

        Migrator.parseContentCopy = function (card) {
            var widgets = card.widgets;
            var copy = '';
            var altCopy = '';

            Array.prototype.forEach.call(widgets, function (widget) {
                if (widget.type === 'copy' || widget.type === 'subtitle') {
                    altCopy += widget.content.html;
                }
            });

            // On the chance that only an image is selected in the proto card
            if (copy.trim() === '') {
                copy = altCopy;
            }

            return copy;
        };

        Migrator.parseContentTypes = function (type, card) {
            var widgets = card.widgets;
            var types = [];

            Array.prototype.forEach.call(widgets, function (widget) {
                if (widget.type === type) {
                    types.push(widget.content);
                }
            });

            return types;
        };

        Migrator.contentTypeDdHandler = function contentTypeDdHandler(e) {
            var target = e.target;

            this.pageWip.contentType = target.value;
            this.storage.setSaved();
        };

        Migrator.buildUrl = function buildUrl(page, submissionType) {
            var type = page.contentType;
            var route = this.route;

            var host = typeof this.domain === 'string' && ensureWsmRoute(this.domain) || this.host + '/';
            var query = '?configCtx=' + JSON.stringify(this.configCtx);

            if (type === "departmentCard") {
                route = 'route/base-view/departments';
            }
            if (submissionType) {
                route = 'route/base-view/' + submissionType;
            }
            return host + route + query;
        };

        Migrator.notify = function (action, data, source, target) {
            var content = {
                source: source || 'migrationTool',
                target: target || 'viewer',
                action: action,
                data: data
            };

            // Let preview know what's going on
            window.top.postMessage(content, '*');
        };

    }).requires(Co.context.configCtx, sb.util.submissionconfirmer, sb.migrator.storage, sb.migrator.card, sb.migrator.sendchunks, Co.service.remote.i18n);

    function htmlEscape(str) {
        if (str) {
            return str
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
        return str;
    }

    function grabJSON(s) {
        return JSON.parse(decodeURIComponent(s.substr(s.indexOf("{"), s.lastIndexOf("}") - s.indexOf("{") + 1))) || {};
    }

    function ensureWsmRoute(url) {
        return url.includes('/wsm') ? url : url + '/wsm/';
    }

    function generateId() {
        var s = "abcdefghijklmnopqrstuvwxyz01234567890123456789";
        var ret = "";
        var i, k;
        for (i = 0; i < 3; i++) {
            for (k = 0; k < 6; k++) {
                ret += s.split("")[Math.floor(Math.random() * ((i === 0 && k === 0) ? 26 : s.split("").length))];
            }
            if (i + 1 < 3) {
                ret += "-";
            }
        }
        return ret;
    }

    function show(el) {
        el && el.classList.remove('hidden');
    }

    function hide(el) {
        el && el.classList.add('hidden')
    }
})();
