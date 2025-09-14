var Test = new Class({

    initialize: function (element) {
        this.componentElement = $mt(element);
        this.singlePath = this.componentElement.getProperty('template');
    },

});