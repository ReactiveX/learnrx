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
        }).promise();

        return Rx.Observable.fromPromise(promise);
    }

    function main () {
        var $input = $('#textInput'),
            $results = $('#results');

        var subscription = Rx.Observable.fromEvent($input, 'keyup')
            .map(function (e) { return $(e.target).val(); })

            // TODO: Add retry logic
            .flatMapLatest(function (text) {
                return searchWikipedia(text);
            })

            .throttle(500)
            .distinctUntilChanged()
            .subscribe(function (data) {

                $results.empty();

                var result = data[1];
                $.each(result, function (i, value) {
                    $('<li>' + value + '</li>').appendTo($results);
                });

            }, function (xhr) {
                $results.empty();

                $('<li>' + xhr.statusText + '</li>').appendTo($results);
            });
    }

	$(function () {

		main();

	});    

}(this, jQuery))

