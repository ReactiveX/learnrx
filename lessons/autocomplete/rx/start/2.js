(function (window, $, undefined) {

    function searchWikipedia (term) {
        var promise = $.ajax({
            url: 'http://en.wikipedia.org/w/api.php',
            dataType: 'jsonp',
            data: {
                action: 'opensearch',
                format: 'json',
                search: encodeURI(term)
            }
        });

 		return promise;
    }

    function main () {
        var $input = $('#textInput'),
            $results = $('#results');

        Rx.Observable.fromEvent($input, 'keyup')
        	.map(function (e) { return $(e.target).val(); })
        	.flatMap(function (text) {

        		$results.empty();

        		// TODO: Query wikipedia

        	});
    }

	$(function () {

		main();

	});    

}(this, jQuery))

