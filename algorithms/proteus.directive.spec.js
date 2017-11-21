/*global module, require, sb, Co, describe, it, expect */
(function(){

    "use strict";
    "import Co.directive"

    if (typeof module !== "undefined") {
        require('hydra-core').scan(require.resolve('hydra-base'), 'base').register(module);
    }
    proteus.directive("spec", function() {});

    describe("proteus directive", function() {

        it("is a Co Module", function() {
            expect(proteus.directive.isCo).toBeTruthy();
            expect(proteus.directive.moduleFactory).toBe(Co.directive.moduleFactory);
        });
    });
})();