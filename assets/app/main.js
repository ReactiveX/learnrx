var codeMirrors = [],
	last = new Date();


window.onload = function() {
	function save() {
		var answers = [];
		$(".lesson").each(function(cnt,item) {
			var go = $(".go", item)[0],
				code = $(".code", item)[0];

			if (window.getComputedStyle(item).visibility !== "hidden") {
				answers.push($(code).val());
			}
		});

		localStorage.setItem("newState", JSON.stringify({answers: answers}));
	}

	// This code adds a reduce question in the middle
	var state = localStorage.getItem("state");
	if (state) {
		state = JSON.parse(state);
		state.answers.splice(18,0,$("#q18").val());
		localStorage.setItem("newState", JSON.stringify(state));
		delete localStorage.state;
	}

	var state = localStorage.getItem("newState");
	if (state) {
		state = JSON.parse(state);
		var firstUnfinishedQuestion;

		$(".lesson").each(function(cnt,item) {
			var go = $(".go", item)[0],
				code = $(".code", item)[0],
				post = $(".post", item)[0];

			if (cnt < state.answers.length) {
				$(code).val(state.answers[cnt]);
				item.style.visibility = "visible";
				if (post !== undefined) {
					post.style.visibility = "visible";
				}
			}
			else if (cnt === state.answers.length) {
				item.style.visibility = "visible";
			}
		});
	}

	// Load all the lessons
	var lessons = $(".lesson");

	lessons.each(function(cnt, item) {
		var go = $(".go", item)[0],
			output = $(".output", item)[0],
			code = preformatCode($(".code", item)[0]),
			showAnswer = $(".showAnswer", item)[0],
			answer = preformatCode($(".answer", item)[0]),
			codeMirror = CodeMirror.fromTextArea(code, {
				lineNumbers: true,
				matchBrackets: true,
				mode: "text/typescript",
				tabSize: 4,
				indentWithTabs: true,
				extraKeys: {
					"F4": function(cm) {
					  cm.setOption("fullScreen", !cm.getOption("fullScreen"));
					},
					"Esc": function(cm) {
					  if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
					}
				  }
			}),
			post = $(".post", item)[0],
			verifierScript = $(".verifier", item)[0],
			controls = $(".control", item);

		codeMirrors.push(codeMirror);
		go.onclick = function() {
			try {
				var verifier = eval("(" + verifierScript.innerText + ")");

				try {
					codeMirror.save();
					save();
					verifier($(code).val(), item);

					if (post !== undefined) {
						post.style.visibility = "visible";
					}
					if (cnt < lessons.length - 1) {
						lessons[cnt + 1].style.visibility = "visible";
					}

				} catch (ex) {
					alert(ex);
				}
			} catch (ex) {
				alert(ex);
			}
		};

		if (showAnswer) {
			showAnswer.onclick = function() {
				codeMirror.setValue(answer.innerText);
			};
		}
	});

	// Convenience method for testing
	window.showAllAnswers = function() {
		var lessons = $(".lesson");

		lessons.each(function(cnt,item) {
			var go = $(".go", item)[0],
				code = $(".code", item)[0],
				output = $(".output", item)[0],
				showAnswer= $(".showAnswer", item)[0],
				answer= preformatCode($(".answer", item)[0]),
				codeMirror = codeMirrors[cnt],
				post = $(".post", item)[0],
				verifierScript = $(".verifier", item)[0],
				controls = $(".control", item);

			if (!answer || answer.innerText.length === 0){
				return;
			}

			codeMirror.setValue(answer.innerText);

			try {
				var verifier = eval("(" + verifierScript.innerText + ")");

				try {
					codeMirror.save();
					save();
					verifier($(code).val(), item);

					if (post !== undefined) {
						post.style.visibility = "visible";
					}
					if (cnt < lessons.length-1) {
						lessons[cnt+1].style.visibility = "visible";
					}

				}
				catch(ex) {
					alert(ex);
				}
			}
			catch(ex) {
				alert(ex);
			}
		});
	};
}