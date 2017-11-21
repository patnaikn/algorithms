/**
 * Created by sagares on 19/07/17.
 */
/*jshint es3: false, forin: true, freeze: true, latedef: true, newcap: false, strict: true, undef:true, camelcase: true, curly: true, eqeqeq: false, immed: true, lastsemic: true, onevar: true, quotmark: double, unused:true, maxdepth: 4, maxcomplexity: 5 */
/*globals $, base, describe, it, expect, Co, waitsFor, runs */

proteus.directive("proautocomplete", function (nodes, utilAgent, urlUtil) {

    "use strict";
    "import proteus.service.nodesclient, Co.util.agent, Co.util.url";

    var AutoComplete = this, wrapper;
    var cache = Co.context.cache.create();

    AutoComplete.init = function (element, options) {
        var self = this;
        self.setOptions(options);
        self.element = element;
        self.inputElement = element.querySelector('input');
        self.selectBox = document.querySelector('#search-options');
        self.domainSelect = document.querySelector('#domain-select');
        this.mainPage = $(document);
        self.body = this.mainPage.find('body');
        self.nodeContainer = this.mainPage.find("#node-container");
        self.detailContainer = this.mainPage.find("#detail-container");
        this.browserUrl = window.location.origin + "/route/base-view/proteusProBrowser";
        self.buildMarkup(self);
        self.keyCodes = {
            'downArrow' : 40,
            'upArrow' : 38,
            'tab' : 9,
            'enter': 13
        }
        self.domainMap = {};
        if(!cache.get('nodes')){
            cache.set('nodes',Co.when({}));
        }
    };

    AutoComplete.initializeDomainMap= function(){
        var self = this;
        self.domainMap = {
            "cadillac": "cadillac",
            "cardCollections": "cards",
            "chevroletNodes": "chevrolet",
            "cmsNodes": "cms",
            "contentNodes": "content",
            "coreNodes": "core",
            "dealerNodes": "dealer",
            "designNodes": "design",
            "designRegistryNodes": "",
            "developerNodes": "developer",
            "editorNodes": "editor",
            "fordNodes": "ford",
            "hyundaiNodes": "hyundai",
            "incentiveNodes": "incentive",
            "infinitiNodes": "infiniti",
            "inventoryNodes": "inventory",
            "lexus": "lexus",
            "agencyParallaxNodes": "agency-parallax",
            "sandbox": "sandbox",
            "schemaNodes": "schema",
            "searchNodes": "search",
            "socialNodes": "social",
            "toyota": "toyota",
            "viewNodes": "view",
            "webIdNodes": "webId"
        }
    };

    AutoComplete.buildMarkup = function (self) {
        var dropDownWrapper = document.createElement('div');
        var dropDown = document.createElement('div');
        var results = document.createElement('div');
        var resultsOptions = document.createElement('ul');
        var message = document.createElement('div');

        wrapper = document.getElementById('autocompletewrapper');
        if(!wrapper){
            wrapper = document.createElement('div');
            wrapper.setAttribute('id','autocompletewrapper');
        }

        self.wrapper = wrapper;
        self.inputElement.setAttribute('placeholder','Enter name or id..');
        message.innerText = "Please enter 3 or more characters";
        self.element.classList.add('autocomplete');
        self.inputElement.autocomplete = "off";
        self.resultsOptions  = resultsOptions;
        self.dropdown = dropDown;
        self.message = message;

        dropDownWrapper.classList.add('dropdown-wrapper');
        dropDown.classList.add('closed');
        message.classList.add('message');
        results.classList.add('result');
        resultsOptions.classList.add('items');
        dropDownWrapper.appendChild(dropDown);
        results.appendChild(resultsOptions);
        results.appendChild(message);
        dropDown.appendChild(results);
        self.element.appendChild(dropDownWrapper);
        document.body.appendChild(wrapper);
    };

    AutoComplete.clearOptions = function(results){
        var options = results.querySelectorAll('li');
        if(options){
            for(var i=0;i<options.length;i++){
                options[i].remove();
            }
        }
    };

    AutoComplete.loadReader = function(modelId) {
        var self = this;
        self.body.attr("class", "next-page");
        var urlToHit = window.location.origin + "/route/base-view/proteusProReader?" + "content=" + modelId + "&context=proReader";
        var configForReader = {
            "type": "get",
            "path": urlToHit
        };

        Co.when(utilAgent.request(configForReader)).then(function (data) {
            self.detailContainer.empty().append(data);
            self.nodeContainer.find('.collapse').collapse({
                toggle: false
            });
            //self.getDomainDetails();

        });
    };

    AutoComplete.getDomainDetails = function () {

        var self = this;
        self.domainID = "schema/domain/a40663fa-e7fd-4b62-bf38-00808c011b5b";
        self.domainSelect.selectedindex = 11;
        var params = "?content=" + self.domainID + "&context=domainDetails";
        var config = {
            "type": "get"
            , "path": this.browserUrl + params
        };
        Co.when(utilAgent.request(config))
            .then(function (result) {
                self.nodeContainer.empty().append(result);
            });
    };

    AutoComplete.select = function (e) {
        var self = this;
        var modelId = e.target.getAttribute('data-href') ? e.target.getAttribute('data-href') :e.target.parentElement.getAttribute('data-href');

        self.inputElement.value = modelId;
        self.close(self.dropdown);

        if(self.redirectReader){
            self.loadReader(modelId);
        }
    };

    AutoComplete.close = function (dropdown) {
        if(!dropdown.classList.contains('closed')) {
            dropdown.classList.remove('open');
            dropdown.classList.add('closed');
            wrapper.classList.remove('autocomplete-wrapper');
        }
    };

    AutoComplete.open = function (dropdown) {
        if(!dropdown.classList.contains('open')){
            dropdown.classList.remove('closed');
            dropdown.classList.add('open');
            wrapper.classList.add('autocomplete-wrapper');
        }
    };

    AutoComplete.closeAll = function () {
        var openDropDowns = document.querySelectorAll('.autocomplete .dropdown-wrapper .open');
        for(var i=0; i < openDropDowns.length;i++){
            openDropDowns[i].classList.remove('open');
            openDropDowns[i].classList.add('closed');
            wrapper.classList.remove('autocomplete-wrapper');
        }
    };

    AutoComplete.processResults = function (results, dataPromise, searchText, message, anchorTarget) {
        var options, self= this;
        self.clearOptions(results);
        return Co.when(dataPromise).then(function (data) {
            var links = [];
            var domainSearches = [];

            if(self.domainSelect.value){
                self.initializeDomainMap();
                var selectedDomain = self.domainMap[$(self.domainSelect.selectedOptions[0]).attr("data-domain-name")];
                for(var key in data.searches){
                    if(key.match('domain='+selectedDomain) || key.match('owner='+selectedDomain)){
                        domainSearches[key] = data.searches[key];
                    }
                }
            }

            if(Object.keys(domainSearches).length <= 0){
                domainSearches = data.searches;
            }


            if(self.link){
                for(var key in domainSearches){
                    if(key.match(self.link)){
                        links.push.apply(links, domainSearches[key]);
                    }
                }
            }else{
                for(var key in domainSearches){
                    links.push.apply(links, domainSearches[key]);
                }
            }

            var linkNodes = [];
            links.forEach(function(id){
                for(var i=0; i<data.processedData.length; i++){
                    if(data.processedData[i].id == id) {
                        linkNodes.push(data.processedData[i]);
                    }
                };
            });


            var searchArray = [];
            if(linkNodes.length > 0){
                searchArray = linkNodes;
            }else{
                searchArray = data.processedData;
            }


            searchArray.forEach(function (element) {
                if (element.id.match(searchText) || element.name.toLowerCase().match(searchText.toLowerCase())) {
                    var option = document.createElement('li');
                    var id = document.createElement('div');
                    var nameElm = document.createElement('div');
                    var ownerElm = document.createElement('div');
                    id.classList.add('id');
                    nameElm.classList.add('name');
                    id.innerHTML = element.id;
                    nameElm.innerHTML = element.name;
                    ownerElm.innerHTML = 'Owner Domain: ' + element.owner;
                    ownerElm.classList.add('owner');
                    option.setAttribute('data-href', element.id);
                    option.classList.add('item');
                    option.appendChild(nameElm);
                    option.appendChild(id);
                    option.appendChild(ownerElm);
                    results.appendChild(option);
                }
            });
            options = results.querySelectorAll('li');
            self.options = options;
            addTabIndex(self.options);
            if(options && options.length === 0){
                message.innerHTML = 'No matching nodes..';
            }else{
                message.innerHTML = '';
            }
        });
    };


    function addTabIndex(options){
        for(var i=0;i <options.length;i++){
            options[i].tabIndex = i;
        }
    }

    AutoComplete.search = function (e) {
        var self = this;
        var searchText = e.target.value;
        var cacheData = cache.get('nodes');
        self.open(self.dropdown);
        if(searchText.length > 2){
            self.message.innerHTML = 'Searching.....';

            if (!cacheData[self.modelId]) {
                if (!cacheData[self.modelId]) {
                    cacheData[self.modelId] = Co.when(nodes.load(self.modelId));
                    cache.set('nodes', cacheData);
                }
            }
            self.processResults(self.resultsOptions, cacheData[self.modelId], searchText, self.message);
        }else{
            self.clearOptions(self.resultsOptions);
            self.message.innerHTML = "Please enter 3 or more characters";
        }
    };


    AutoComplete.focusFirstListElement = function(e){
        var self = this;
        if(e.keyCode == self.keyCodes.downArrow || e.keyCode == self.keyCodes.tab){
            e.preventDefault();
            self.options[0].focus();
        }
    };

    AutoComplete.focus = function (e) {
        var self = this;
        var code = e.keyCode;

        if (code == self.keyCodes.downArrow || code == self.keyCodes.upArrow) {
            e.preventDefault();
            var activeIndex = document.activeElement.tabIndex;
            var nextIndex = code == self.keyCodes.downArrow ? activeIndex + 1 : activeIndex - 1;
            for (var i = 0; i < self.options.length; i++) {
                if (nextIndex == self.options[i].getAttribute('tabindex')) {
                    self.options[i].focus();
                    break;
                }
            }
        }
        else if (code == self.keyCodes.enter) {
            var modelId = e.target.getAttribute('data-href');
            if (self.redirectReader) {
                self.redirectProteusReader(modelId);
                self.select(e);
            }
            else {
                self.select(e);
            }
        }
        return true;
    };

    AutoComplete.setLink = function (e) {
        var self = this;
        self.link = self.selectBox.value;

    };

    AutoComplete.setLink.context = "selectBox";
    AutoComplete.setLink.event = "change";

    AutoComplete.search.context = "inputElement";
    AutoComplete.search.event = "keyup";

    AutoComplete.closeAll.context = "wrapper";
    AutoComplete.closeAll.event = "click keydown";

    AutoComplete.select.context = "resultsOptions";
    AutoComplete.select.event = "click";

    AutoComplete.focus.context = "resultsOptions";
    AutoComplete.focus.event = "keydown";

    AutoComplete.focusFirstListElement.context = 'inputElement';
    AutoComplete.focusFirstListElement.event = 'keydown';

}).requires(proteus.service.nodesclient, Co.util.agent, Co.util.url);
