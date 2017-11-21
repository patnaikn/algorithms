/*globals Co*/
(function () {
    sb.migrator("card", function () {
        "use strict";

        var Instance = this;

        Instance.setup = function(id, arr) {
            return new Card(id, arr);
        };

        Instance.fromJSON = function fromJSON(json) {
            var obj = JSON.parse(json);
            return this.setup(obj.id, obj.widgets);
        };

        function Card (id, arr) {
            this.id = id || "webId-pageName-0";
            this.index = id.split("-").pop() || 0;
            this.primary = false;
            this.widgets = arr || [];
        }

        Card.prototype.addWidget = function addWidget(widget) {
            this.widgets.push(widget);
        };

        Card.prototype.updateWidget = function updateWidget(widget) {
            var self = this;
            var existing = 0;

            Array.prototype.forEach.call(this.widgets, function (c, i) {
                if (c.widgetId === widget.widgetId) {
                    self.widgets[i] = widget;
                    existing += 1;
                }
            });

            if (existing === 0) {
                this.widgets.push(widget);
            }
        };

        Card.prototype.deleteWidget = function deleteWidget(widget) {
            var self = this;
            var removed;

            Array.prototype.forEach.call(this.widgets, function (wid, i) {
                if (wid.widgetId === widget.widgetId) {
                    removed = self.widgets.splice(i, 1);
                }
            });

            return removed;
        };

        Card.prototype.setWidgetProperty = function setWidgetProperty(widget, prop, val) {
            Array.prototype.forEach.call(this.widgets, function (wid, i) {
                if (wid.widgetId === widget.widgetId) {
                    wid[prop] = val;
                }
            });
        };

        Card.prototype.toPreviewJson = function toPreviewJson() {
            return {
                "wrapper": {
                    "id": this.id,
                    "name": this.getTitle()
                },
                "items": this.widgets
            };
        };

        Card.prototype.getTitle = function getTitle() {
            var title = "";
            var altTitle1 = "";
            var altTitle2, altTitle3, altTitle4;

            if (this.widgets[0] && this.widgets[0].type === "staff") {
                var staff = this.parseStaffObject(this.widgets);

                return staff.firstName + " " + staff.lastName;
            }

            Array.prototype.forEach.call(this.widgets, function (wid) {
                if (wid.type === "title") {
                    title += " " + wid.content.text;
                }
                // Fallback strings
                if (wid.type === "subtitle") {
                    altTitle1 = wid.content.text;
                } else if (wid.type === "copy") {
                    altTitle2 = wid.content.text.substring(0, 30);
                } else if (wid.type === "media") {
                    altTitle3 = wid.content.imageName;
                } else if (wid.type === "link") {
                    altTitle4 = wid.content.name;
                }
            });

            return title.trim() || altTitle1.trim() || altTitle2 || altTitle3 || altTitle4 || "";
        };

        Card.prototype.parseStaffObject = function (widgets) {
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
                    staff[wid.field] = wid.content.text || wid.content.url || "";
                }
            });

            return staff;
        };
    }).requires();
}());