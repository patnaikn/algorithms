/*jshint browser: true */
/*globals sb */
sb.migrator("sendchunks", function () {
    "use strict";

    var SendChunks = this;

    SendChunks.create = function create(migrateCards, confirmationPrompt) {
        this.migrateCards = migrateCards;
        this.confirmationPrompt = confirmationPrompt;

        var isStaff = this.migrateCards.pageWip.contentType === 'departmentCard';

        this.requests = [];
        this.requestNumber = 0;
        this.totalRequests = this.getTotalRequests(this.migrateCards.dataItems, isStaff);
    };

    SendChunks.processRequests = function processRequests() {
        this.setSortOrder();
        this.populateImageRequests();
        this.processImage(0);
    };

    SendChunks.setSortOrder = function setSortOrder() {
        this.migrateCards.dataItems.forEach(function (item, i) {
            item.sortOrder = i;
        });
    };

    SendChunks.populateImageRequests = function populateImageRequests() {
        var i;
        var mc = this.migrateCards;
        for (i = mc.dataItems.length - 1; i >= 0; i--) {
            if (mc.dataItems[i].image && mc.dataItems[i].image.trim() !== "") {
                this.requests.push({
                    type: "staffPage",
                    data: mc.dataItems[i]
                });
                mc.dataItems.splice(i, 1);
            }
            if (mc.dataItems[i] && mc.dataItems[i].media && mc.dataItems[i].media.images && mc.dataItems[i].media.images.length) {
                this.requests.push({
                    type: "landingPage",
                    data: mc.dataItems[i]
                });
                mc.dataItems.splice(i, 1);
            }
        }
    };

    SendChunks.processImage = function processImage(imageIndex) {
        var mc = this.migrateCards;
        if (this.requests.length) {
            if (this.requests[0].type === "staffPage") {
                this.uploadEmployeeImage(0);
            } else if (this.requests[0].type === "landingPage") {
                if (this.requests[0].data.media.images[imageIndex]) {
                    this.uploadContentImage(imageIndex);
                } else {
                    this.requests[0].data.submissionType = "cards";
                    mc.dataItems.push(this.requests[0].data);
                    this.requests.splice(0, 1);
                    this.processImage(0);
                }
            }
        } else {
            if (mc.pageWip.contentType === 'departmentCard') {
                this.generateDepartmentCards(this.getUniqueDepartments(mc.dataItems));
            } else {
                mc.dataItems = this.reorderCards(mc.dataItems);
                this.doSubmission();
            }
        }
    };

    SendChunks.uploadEmployeeImage = function uploadEmployeeImage() {
        var self = this;
        var mc = this.migrateCards;
        var request = new XMLHttpRequest();
        var url = mc.buildUrl(mc.pageWip, "importmedia");

        this.requestNumber++;
        this.confirmationPrompt.updateProgressBar(this.requestNumber, this.totalRequests);

        request.open('POST', url, true);
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        request.onerror = function () {
            console.warn("Could not connect to get Content Types");
            self.confirmationPrompt.submissionFailureUX();
        };

        request.onload = function requestOnLoad() {
            if (request.status >= 200 && request.status < 400) {
                self.requests[0].data.submissionType = "employees";
                self.requests[0].data.image = JSON.parse(request.responseText).images[0].mssUrl;
                mc.dataItems.push(self.requests[0].data);
                self.requests.splice(0, 1);

                self.processImage(0);
            } else {
                console.warn("Image could not be migrated: status " + request.status);
                self.confirmationPrompt.submissionFailureUX();
            }
        };

        request.send("data=" + encodeURIComponent(JSON.stringify({
            images: [{
                url: self.requests[0].data.image,
                label: self.requests[0].data.firstName + " " + self.requests[0].data.lastName,
                type: self.requests[0].data.type
            }]
        })));
    };

    SendChunks.uploadContentImage = function uploadContentImage(imageIndex) {
        var self = this;
        var mc = this.migrateCards;
        var request = new XMLHttpRequest();
        var url = mc.buildUrl(mc.pageWip, "importmedia");

        this.requestNumber++;
        this.confirmationPrompt.updateProgressBar(this.requestNumber, this.totalRequests);

        request.open('POST', url, true);
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        request.onerror = function () {
            console.warn("Could not connect to get Content Types");
            self.confirmationPrompt.submissionFailureUX();
        };
        request.onload = function requestOnLoad() {
            if (request.status >= 200 && request.status < 400) {
                self.requests[0].data.media.images[imageIndex].url = JSON.parse(request.responseText).images[0].mssUrl;
                self.processImage((imageIndex + 1));
            } else {
                console.warn("Image could not be migrated: status " + request.status);
                self.confirmationPrompt.submissionFailureUX();
            }
        };

        request.send("data=" + encodeURIComponent(JSON.stringify({
            images: [{
                url: self.requests[0].data.media.images[imageIndex].url,
                label: self.requests[0].data.media.images[imageIndex].imageName,
                type: self.requests[0].data.type
            }]
        })));
    };

    SendChunks.generateDepartmentCards = function generateDepartmentCards(departments) {
        var displayNames = {};
        var mc = this.migrateCards;
        if (departments && Array.isArray(departments)) {
            departments.forEach(function (dept) {
                mc.dataItems.push({
                    "submissionType": "cards",
                    "type": "departmentCard",
                    "primary": false,
                    "media": {
                        "category": "primaryImages",
                        "images": []
                    },
                    "displayName": displayNames[dept] || "Department Card",
                    "title": displayNames[dept] || dept + " Department",
                    "subtitle": "",
                    "copy": "",
                    "hyperlinks": {
                        "primary": []
                    },
                    "departmentName": dept
                });
            });
        }
        this.doSubmission();
    };

    SendChunks.getUniqueDepartments = function getUniqueDepartments(cards) {
        var departments = [];
        if (!cards || !Array.isArray(cards)) {
            return departments;
        }
        if (cards) {
            cards.forEach(function eachCard(card) {
                if (card.department && departments.indexOf(card.department) < 0) {
                    departments.push(card.department);
                }
            });
        }
        return departments;
    };

    SendChunks.getTotalRequests = function getTotalRequests(items, isStaff) {
        var ret = 0;
        if (!items || !Array.isArray(items)) {
            return ret;
        }
        items.forEach(function (item) {
            if (item.image && item.image.trim() !== "") {
                ret++;
            } else if (item.media && item.media.images && Array.isArray(item.media.images)) {
                ret += item.media.images.length;
            }
        });
        if (isStaff) {
            ret += this.getUniqueDepartments(items).length;
        }
        ret += items.length;
        return ret;
    };

    SendChunks.doSubmission = function doSubmission() {
        var self = this;
        var mc = this.migrateCards;
        if (mc.dataItems.length) {
            var request = new XMLHttpRequest();
            var url = mc.buildUrl(mc.pageWip, mc.dataItems[0].submissionType);

            this.requestNumber++;
            this.confirmationPrompt.updateProgressBar(this.requestNumber, this.totalRequests);

            request.open('POST', url, true);
            request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            request.onerror = function () {
                console.warn("Could not connect to get Content Types");
                self.confirmationPrompt.submissionFailureUX();
            };
            request.onload = function () {
                if (request.status >= 200 && request.status < 400) {
                    mc.dataItems.splice(0, 1);
                    self.doSubmission();
                } else {
                    console.warn("Content could not be migrated: status " + request.status);
                    self.confirmationPrompt.submissionFailureUX();
                }
            };
            request.send("data=" + encodeURIComponent('{"items":[' + JSON.stringify(mc.dataItems[0]) + ']}'));
        } else {
            this.finish();
        }
    };

    SendChunks.finish = function finish() {
        console.log("done!");
        this.migrateCards.storage.setSaved('delete');
        this.confirmationPrompt.submissionSuccessUX();
    };

    SendChunks.reorderCards = function reorderCards(cards) {
        var primaryIndex;

        cards.sort(function (a, b) {
            return a.sortOrder - b.sortOrder;
        });

        for (var i in cards) {
            if (cards[i].primary) {
                primaryIndex = i;
                break;
            }
        }
        if (primaryIndex) {
            this.swapCards(cards, primaryIndex);
        }
        return cards;
    };

    SendChunks.swapCards = function swapCards(cards, primaryIndex) {
        var temp = cards[0];
        cards[0] = cards[primaryIndex];
        cards[primaryIndex] = temp;
    };

});
