/**
 * Created by sonip on 7/18/17.
 */

(function() {
    "use strict";
    "import Co.util.agent, Co.util.url";

    proteus.directive("cascade", function (utilAgent, utilUrl) {

        var cascade = this;

        var readerTarget = null;

        cascade.init = function (element, options) {

            this.setOptions(options);

            this.mainPage = $(element);
            this.domainSelect = this.mainPage.find("#domain-select");
            this.nodeContainer = this.mainPage.find("#node-container");
            this.searchOptions = this.mainPage.find("#search-options");
            this.detailContainer = this.mainPage.find("#detail-container");
            this.graphButton = this.mainPage.find("#get-graph");
            this.graphContainer = this.mainPage.find("#graph-container");
            this.nodeFilterInput = this.mainPage.find(".pro-node-filter");
            this.addNodeBtn = this.mainPage.find(".overlay");
            this.removeNodeBtn = this.mainPage.find("[name=removeNode]");

            this.anchorHrefLinks = document.querySelectorAll("a[if=href]") || document.querySelectorAll("a[if=model]");
            this.editNodeBtn = this.mainPage.find("[name=update]");
            this.cloneNodeBtn = this.mainPage.find("[name=clone]");
            this.deleteNodeBtn = this.mainPage.find("[name=delete]");
            this.submitFormBtn = this.mainPage.find("[name=submit]");
            this.cancelFormEditBtn = this.mainPage.find("[name=cancel]");

            //this.links = {};
            this.browserUrl = window.location.origin + "/route/base-view/proteusProBrowser";
            this.postInit();
            this.onPopStateChange();
        };

        cascade.postInit = function () {
            this.domainSelect.chosen({
                width: "100%"
            });
            this.searchOptions.chosen({
                width: "100%"
            });
        };

        cascade.getDomainDetails = function (e) {

            this.mainPage.attr("class", "next-page");
            var self = this;
            var domainID = this.domainSelect.val();

            var params = "?content=" + domainID + "&context=domainDetails";
            var config = {
                "type": "get"
                , "path": this.browserUrl + params
            };
            Co.when(utilAgent.request(config))
                .then(function (result) {
                    history.pushState(null, null, config.path);
                    self.nodeContainer.empty().append(result);
                    self.nodeContainer.find('.collapse').collapse({
                        toggle: false
                    });
                    cascade.reactivate(self.mainPage[0]);
                    self.loadReader(self.domainID);
                });
        };

        cascade.reactivate = function (elem) {
            Co.directive.deactivate(elem || this.mainPage[0]);
            Co.directive.activate(elem || this.mainPage[0]);
        };

        cascade.loadReader = function(modelId) {

            var self = this,urlToHit;
            if(modelId) {
                if (modelId.includes(window.location.origin)) {

                    urlToHit = modelId + "&context=proReader";
                }
                else {
                    if (modelId.includes('proteusProReader?')) {
                        urlToHit = window.location.origin + "/route/base-view/" + modelId + "&context=proReader";
                    }
                    else {
                        urlToHit = window.location.origin + "/route/base-view/proteusProReader?content=" + modelId + "&context=proReader";

                    }
                }
            }
            else {
                urlToHit = window.location.origin + "/route/base-view/proteusProReader?content=" + modelId + "&context=proReader";
            }

            var configForReader = {
                "type": "get",
                "path": urlToHit
            };

            Co.when(utilAgent.request(configForReader)).then(function (data) {
                history.pushState(null, null, configForReader.path);
                self.detailContainer[0].innerHTML = data;
                cascade.reactivate(self.mainPage[0]);
            });
        };

        cascade.loadCreator = function (nodeLink) {
            var self = this;
            var urlToHit = window.location.origin + "/route/base-view/proteusProCreator?content=schema%2Fmodels%3Fdomain%3D" + nodeLink[0]+"%26plural%3D"+nodeLink[1];
            var config = {
                "type": "get",
                "path": urlToHit
            };
            Co.when(utilAgent.request(config)).then(function (data) {
                history.pushState({title: document.title, url: config.path}, document.title, config.path);
                self.detailContainer[0].innerHTML = data;
                cascade.reactivate(self.mainPage[0]);
            });
        };

        cascade.onPopStateChange = function(){
            var self = this;
            window.addEventListener('popstate', function (e) {
                var state = e.state;
                if (state == null) {
                    var config = {
                        "type": "get",
                        "path": window.location.href,
                        "cache": false
                    };
                    Co.when(utilAgent.request(config)).then(function (data) {
                        self.detailContainer[0].innerHTML = data;
                        cascade.reactivate(self.mainPage[0]);
                    });
                }
            });
        };

        cascade.loadProteusReader = function(e, target) {
            if (e) {
                e.preventDefault();
                target = e.target;
            } else if (readerTarget) {
                target = readerTarget;
            }
            var that = this;

            if(target.classList.contains("child-group-item")) {
                toggleNodeSelect($(target));
                readerTarget = target;
                if(target.dataset.href){
                    that.loadReader(target.dataset.href);
                }
                else {
                    that.loadReader(target.title);
                }

            } else if(target.classList.contains("par-group-item")) {
                toggleNodeSelect($(target));
                var link = target.dataset.href;
                var parts = link.split('?');
                var domain = parts[0].split('/');
                readerTarget = target;
                that.loadCreator(domain);
            }

        };
        
        function toggleNodeSelect(node) {

            if(node.hasClass("list-group-item")){
                node = node.addClass("active").parent();

                let btns = node.siblings(".sel-li").find(".list-group-item");
                btns.removeClass("active");

                let par = node.closest(".collapse").prev();
                if (par.hasClass("list-group-item")) {
                    toggleNodeSelect(par);
                }
            }
        }

        cascade.loadProteusUpdater = function(e) {

            var that = this;

            let target = $(e.target).is("i") ? $(e.target).closest("button") : $(e.target);

            let updateLink = target.attr('data-href');

            let urlToHit = window.location.origin + "/route/base-view/proteusProUpdater" + updateLink;

            var configForUpdater = {
                "type": "get",
                "path": urlToHit
            };

            Co.when(utilAgent.request(configForUpdater)).then(function (data) {
                history.pushState(null, null, configForUpdater.path);
                that.detailContainer[0].innerHTML = data;
                cascade.reactivate(that.mainPage[0]);
            });
        };

        cascade.loadProteusDeleter = function(e) {

            var that = this;

            let target = $(e.target).is("i") ? $(e.target).closest("button") : $(e.target);

            let deleteLink = target.attr('data-href');

            let urlToHit = window.location.origin + "/route/base-view/proteusProDeleter" + deleteLink;

            var configForDeleter = {
                "type": "get",
                "path": urlToHit
            };

            Co.when(utilAgent.request(configForDeleter)).then(function (data) {
                history.pushState(null, null, configForDeleter.path);
                that.detailContainer[0].innerHTML = data;
                cascade.reactivate(that.mainPage[0]);
            });
        };

        cascade.loadProteusCloner = function(e) {

            var that = this;

            let target = $(e.target).is("i") ? $(e.target).closest("button") : $(e.target);

            let cloneLink = target.attr('data-href');

            let urlToHit = window.location.origin + "/route/base-view/proteusProCloner" + cloneLink;

            var configForCloner = {
                "type": "get",
                "path": urlToHit
            };

            Co.when(utilAgent.request(configForCloner)).then(function (data) {
                history.pushState(null, null, configForCloner.path);
                that.detailContainer[0].innerHTML = data;
                cascade.reactivate(that.mainPage[0]);
            });
        };

        cascade.renderGraph = function () {
            if (!this.mainPage.hasClass()) {
                this.mainPage.addClass("show-graph");
                this.graphContainer.EasyTree();
            }
        };

        cascade.addNode = function(e) {

            e.preventDefault();
            var cPar = $(e.target).parent().clone(true);

            cPar.find("input, select").each(function () {
                this.name = this.name.replace(/\d+/g, function(n){ return ++n });
            });

            $(e.target).closest("ul.array").append(cPar);
        };

        cascade.removeNode = function (e) {
            e.preventDefault();
            let target = $(e.target).is("i") ? $(e.target).closest("button") : $(e.target);
            target.closest("li.empty").hide().find("input, select").val("");
        };

        cascade.saveProteusData = function (e) {

            e.preventDefault();
            var that = this;
            var form = $(e.target).closest("form")[0];
            var data = $(form).serialize();

            utilAgent.request({
                path: form.action || window.location.href,
                type: form.getAttribute("method") || "get",
                data: data
            }, data).then(function (res) {
                that.detailContainer[0].innerHTML = res;
                cascade.reactivate(that.mainPage[0]);
            });
        };

        cascade.loadReaderOnClickEvents = function(e){

            e.preventDefault();
            var that = this;
            if(e.target.tagName.toLowerCase() === 'a'){
                that.loadReader(e.target.href);
                cascade.reactivate(that.detailContainer[0]);
            }
        };

        cascade.nodeFilter = function (e) {
            var rex;
            let $items, $this = $(e.target);
            rex = new RegExp($this.val(), 'i');

            $items = $($this.parent().siblings());
            $items.hide();
            $items.filter(function () {
                return rex.test($(this).text());
            }).show();
        };

        cascade.cancelEdit = function (e) {
            e.preventDefault();
            cascade.loadProteusReader.call(this, "", readerTarget);
        };

        cascade.getDomainDetails.context = "domainSelect";
        cascade.getDomainDetails.event = "change";

        cascade.loadProteusReader.context = "nodeContainer";
        cascade.loadProteusReader.event = "click";

        cascade.renderGraph.context = "graphButton";
        cascade.renderGraph.event = "click";

        cascade.nodeFilter.context = "nodeFilterInput";
        cascade.nodeFilter.event = "keyup";

        cascade.addNode.context = "addNodeBtn";
        cascade.addNode.event = "click";

        // cascade.removeNode.context = "removeNodeBtn";
        // cascade.removeNode.event = "click";

        cascade.loadProteusUpdater.context = "editNodeBtn";
        cascade.loadProteusUpdater.event = "click";

        cascade.loadProteusCloner.context = "cloneNodeBtn";
        cascade.loadProteusCloner.event = "click";

        cascade.loadProteusDeleter.context = "deleteNodeBtn";
        cascade.loadProteusDeleter.event = "click";

        cascade.saveProteusData.context = "submitFormBtn";
        cascade.saveProteusData.event = "click";

        cascade.cancelEdit.context = "cancelFormEditBtn";
        cascade.cancelEdit.event = "click";

        cascade.loadReaderOnClickEvents.context = "detailContainer";
        cascade.loadReaderOnClickEvents.event = "click";

    }).requires(Co.util.agent, Co.util.url);
})();