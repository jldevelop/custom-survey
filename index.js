const host = 'https://api.fazeclan.com';

function initSurvey() {
  if(getCookie('skipSurvey')) return;

  setSurveyData();
  createSurveyDOM();

  getSurveyData((res) => {
    let surveyFound = false;

    res.data.forEach((survey, i) => {
      if (!surveyFound) {
        if (typeof survey.is_active !== 'undefined') {
          if (survey.is_active) {
            surveyFound = true;
            surveyData = survey;
            window.survey.currentPollId = survey._id;
          }
        }
      }
    });

    if (!surveyFound) {
      if (surveyData.length > 0) {
        surveyData = res.data[0];
        window.survey.currentPollId = res.data[0]._id;
      }
    }

    surveyData.questions.sort((a, b) => a.order - b.order)
    showStartingScreen();
    registerSurveyEventListeners();
  });
}

function loadStyle(url){
  var head = document.getElementsByTagName('HEAD')[0]
    , link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = url;
  head.appendChild(link);
}

function setSurveyData() {
  if (typeof localStorage.surveyData === 'undefined') localStorage.surveyData = JSON.stringify({
    questions: [],
    surveyQuestion: 0
  });

  window.surveyData = [];
  window.survey = {};
  window.survey['currentQuestionIndex'] = '';
  window.survey['currentPollId'] = '';
  window.survey['userId'] = JSON.parse(localStorage.surveyData).user_fingerprint || euidv4Gen();

  let currentStep = JSON.parse(localStorage.surveyData).surveyQuestion;
  if (typeof currentStep !== 'undefined') window.survey.currentQuestionIndex = currentStep;
  else window.survey.currentQuestionIndex = 0;
}

function createSurveyDOM() {
  document.body.insertAdjacentHTML('beforeend', '' +
    '<div id="survey-main-wrapper">\n' +
    '   <div class="survey-container-header">' +
    '     <div class="modal-minimizer-wrapper minimize_survey">' +
    '       <div class="modal-minimizer"></div>' +
    '     </div>' +
    '   </div>' +
    '   <div id="survey-container"></div>\n' +
    '</div>'
  );
}

function createSurveyPage(question) {
  let answersEls = '';
  const questionId = question._id
    , questionText = question.value
    , questionType = question.type;

  question.choices.forEach((answer) => {
    const answerFormat = answer.format;

    if (typeof answerFormat !== 'undefined') {
      if (answerFormat.toLowerCase() === 'image') {
        answersEls +=
          ' <div class="answer-wrapper col-6" data-question-id="' + questionId + '">' +
          '   <div class="answer-image answer_btn" data-answer-id="' + answer.id + '"><img src="' + answer.image_url + '"><span class="answer-image-title">' + answer.value + '</span></div>' +
          ' </div>';
      } else if (answerFormat.toLowerCase() === 'text') {
        answersEls +=
          ' <div class="answer-wrapper col-12" data-question-id="' + questionId + '">' +
          '   <input class="answer-free-text" type="text" data-answer-id="' + answer.id + '"/>' +
          ' </div>';
      } else if (answerFormat.toLowerCase() === 'button') {
        answersEls +=
          ' <div class="answer-wrapper col-12" data-question-id="' + questionId + '">' +
          '   <div class="answer-button answer_btn" data-answer-id="' + answer.id + '">' + answer.value + '</div>' +
          ' </div>';
      }
    }
  });

  const pageTemplate = '' +
    ' <div class="survey-page-wrapper op-0 d-none" data-question="' + questionId + '" data-type="' + questionType + '">' +
    '   <div class="survey-header">' +
    '     <h3 class="header-title">' + questionText + '</h3>' +
    '   </div>' +
    '   <div class="survey-body row">' + answersEls + '</div>' +
    '   <div class="survey-submit-btn multiple_choices_btn btn d-none">Confirm</div>' +
    ' </div>';

  document.getElementById('survey-container').insertAdjacentHTML('beforeend', pageTemplate)
}

function showStartingScreen() {
  const pageTemplate = '' +
    ' <div class="survey-starting-page">' +
    '   <div class="survey-header">' +
    '     <h3 class="header-title">FazeClan</h3>' +
    '   </div>' +
    '   <div class="survey-body survey-welcome-content">Few questions for you...</div>' +
    '   <div class="survey-submit-btn start_survey btn">Start</div>' +
    ' </div>';

  document.getElementById('survey-container').insertAdjacentHTML('afterbegin', pageTemplate)
}

function showThankyouPage() {
  const pageTemplate = '' +
    ' <div class="survey-thankyou-page">' +
    '   <div class="survey-header">' +
    '     <h3 class="header-title">Thank you!</h3>' +
    '   </div>' +
    '   <div class="survey-body survey-thankyou-content">Thank you for your time...</div>' +
    '   <div class="survey-submit-btn close_survey btn">Close</div>' +
    ' </div>';

  document.getElementById('survey-container').insertAdjacentHTML('beforeend', pageTemplate)
}

function startSurvey(e) {
  const element = e.target;
  if (!element.classList.contains('start_survey')) return;

  if (typeof surveyData !== 'undefined') {
    const surveyStartPageEl = document.querySelector('.survey-starting-page');

    surveyData.questions.forEach((question) => {
      createSurveyPage(question);
    });

    surveyStartPageEl.classList.add('op-0');
    setTimeout(() => {
      surveyStartPageEl.classList.add('d-none');
      showActivePage();
    }, 500)
  }
}

//show active survey page and hide inactive pages
function showActivePage() {
  let customText = false;
  const surveyPagesWrapper = document.querySelectorAll('.survey-page-wrapper');
  surveyPagesWrapper.forEach((el) => {
    el.classList.add('op-0');
  });

  setTimeout(() => {
    surveyPagesWrapper.forEach((el) => {
      el.classList.add('d-none');
    });

    if (typeof surveyData.questions[survey.currentQuestionIndex] !== 'undefined') {
      const currentSurveyPage = document.querySelector('.survey-page-wrapper[data-question="' + surveyData.questions[survey.currentQuestionIndex]._id + '"]');
      currentSurveyPage.classList.remove('d-none');

      setTimeout(() => {
        currentSurveyPage.classList.remove('op-0');

        surveyData.questions[survey.currentQuestionIndex].choices.forEach((c) => {
          if (c.format === 'text') customText = true;
        });

        if (currentSurveyPage.getAttribute('data-type') === 'multi_choice' || customText) {
          currentSurveyPage.querySelector('.multiple_choices_btn').classList.remove('d-none');
        } else currentSurveyPage.querySelector('.multiple_choices_btn').classList.add('d-none');
      }, 500)
    } else {
      showThankyouPage();
      setCookie('skipSurvey', true, 60);
    }
  }, 500);
}

function euidv4Gen() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

function answerClickHandler(e) {
  const element = e.target;
  if (!element.classList.contains('answer_btn')) return;

  const questionType = element.closest('.survey-page-wrapper').getAttribute('data-type')
    , questionId = surveyData.questions[survey.currentQuestionIndex]._id
    , choice = []
    , questionsNum = surveyData.questions.length;

  if (questionType === 'multi_choice') {
    if (element.className.includes('selected-answer')) element.classList.remove('selected-answer');
    else element.classList.add('selected-answer');
  } else if (questionType === 'single_choice') {
    element.classList.add('selected-answer');

    let lsSurveyData = JSON.parse(localStorage.surveyData);
    const selectedAnswerEl = document.querySelector('.selected-answer')
    const questionObj = {
      question_id: questionId,
      answers: choice,
      user_fingerprint: survey.userId
    };

    choice.push(selectedAnswerEl.getAttribute('data-answer-id'));
    survey.currentQuestionIndex++;

    lsSurveyData.questions.push(questionObj);
    lsSurveyData.surveyQuestion = survey.currentQuestionIndex;
    lsSurveyData.user_fingerprint = survey.userId;
    localStorage.surveyData = JSON.stringify(lsSurveyData);
    localStorage.surveyData.surveyQuestion = survey.currentQuestionIndex;
    selectedAnswerEl.classList.remove('selected-answer');
    showActivePage();

    if (questionsNum === lsSurveyData.questions.length) {
      sendAllAnswers(lsSurveyData.questions);
      localStorage.removeItem("surveyData");
    }
  }
}

function submitAnswerHandler(e) {
  const element = e.target;
  if (!element.classList.contains('multiple_choices_btn')) return;

  const choices = []
    , questionId = surveyData.questions[survey.currentQuestionIndex]._id
    , lsSurveyData = JSON.parse(localStorage.surveyData)
    , questionsNum = surveyData.questions.length
    ,
    extraFieldVal = document.querySelector('.survey-page-wrapper[data-question="' + surveyData.questions[survey.currentQuestionIndex]._id + '"]').querySelector('.answer-free-text') !== null ?
      document.querySelector('.survey-page-wrapper[data-question="' + surveyData.questions[survey.currentQuestionIndex]._id + '"]').querySelector('.answer-free-text').value : '';

  document.querySelectorAll('.selected-answer').forEach((a) => {
    choices.push(a.getAttribute('data-answer-id'));
  })

  const questionObj = {
    question_id: questionId,
    answers: choices,
    user_fingerprint: survey.userId,
    extra_value: extraFieldVal
  };

  if (extraFieldVal) questionObj.answers = [-1];

  survey.currentQuestionIndex++;
  lsSurveyData.questions.push(questionObj);
  lsSurveyData.surveyQuestion = survey.currentQuestionIndex;
  lsSurveyData.user_fingerprint = survey.userId;
  localStorage.surveyData = JSON.stringify(lsSurveyData);
  localStorage.surveyData.surveyQuestion = survey.currentQuestionIndex;
  document.querySelectorAll('.selected-answer').forEach((a) => {
    a.classList.remove('selected-answer');
  })
  showActivePage();

  if (questionsNum === lsSurveyData.questions.length) {
    sendAllAnswers(lsSurveyData.questions);
    localStorage.removeItem("surveyData");
  }
}

function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + '=; Max-Age=-99999999;';
}

function destroySurvey(e) {
  const element = e.target;
  if (!element.classList.contains('close_survey')) return;

  const surveyMainWrapper = document.querySelector('#survey-main-wrapper');
  surveyMainWrapper.classList.add('op-0');

  setTimeout(() => {
    surveyMainWrapper.remove();
  }, 500)
}

function minMaxSurvey(e) {
  const element = e.target;
  if (!element.classList.contains('minimize_survey')) return;

  document.querySelector('#survey-main-wrapper').classList.add('survey-minimize');
  setCookie('skipSurvey', true, 60);
}

function registerSurveyEventListeners() {
  document.addEventListener('click', answerClickHandler)
  document.addEventListener('click', submitAnswerHandler)
  document.addEventListener('click', destroySurvey)
  document.addEventListener('click', startSurvey)
  document.addEventListener('click', minMaxSurvey)
}


function apiCall(apiObj) {
  return fetch(apiObj.url, apiObj)
    .then((res) => res.json());
}

function getSurveyData(cb) {
  apiCall({
    url: host + '/api/poll/list.json',
    method: 'get'
  },)
    .then((res) => {
      if (!res.error) {
        if (cb) cb(res);
      }
    })
}

/*
* Sending all users answers on end of survey
* */
function sendAllAnswers(questionsArr, cb) {
  apiCall({
    url: host + '/api/poll/' + survey.currentPollId + '/bulk_answer.json',
    method: 'post',
    body: JSON.stringify(
      {
        survey_completed: true
        , questions: questionsArr
      }
    )
  },)
    .then((res) => {
      if (!res.error) {
        if (cb) cb(res);
      } else {
        console.log('error');
        console.log(res.error)
      }
    })
}

function generateQuestionsFormData(pollData) {
  const formData = new FormData();
  formData.append('is_active', pollData.is_active);
  formData.append('name', pollData.name);

  pollData.questions.forEach((q, i) => {
    formData.append('questions[' + i + '][value]', q.value);
    formData.append('questions[' + i + '][type]', q.type);
    formData.append('questions[' + i + '][order]', q.order);

    q.choices.forEach((c, j) => {
      formData.append('questions[' + i + '][choices][' + j + '][value]', c.value);
      formData.append('questions[' + i + '][choices][' + j + '][image_url]', c.image_url);
      formData.append('questions[' + i + '][choices][' + j + '][format]', c.format);
    })
  });

  return formData;
}

function createNewPoll(pollData, cb, err) {
  const formData = generateQuestionsFormData(pollData);

  apiCall({
    url: host + '/api/poll/create.json',
    method: 'post',
    body: new URLSearchParams(formData).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error) {
        generateNewSurveyTemplate()
        if (cb) cb();
      } else {
        console.log('error');
        console.log(res.error)
      }

      document.querySelector('.save_poll').disabled = false
    });
}

function updatePoll(pollData, pollId, cb) {
  const formData = generateQuestionsFormData(pollData);

  apiCall({
    url: host + '/api/poll/' + pollId + '/update.json',
    method: 'put',
    body: new URLSearchParams(formData).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error) {
        if (cb) cb();
      } else {
        console.log('error');
        console.log(res.error)
      }
    });
}

function deletePoll(pollId, cb) {
  apiCall({
    url: host + '/api/poll/' + pollId + '/delete.json',
    method: 'delete',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error) {
        if (cb) cb();
      } else {
        console.log('error');
        console.log(res.error)
      }
    });
}

function deletePollQuestion(questionId, cb) {
  apiCall({
    url: host + '/api/poll/question/' + questionId + '/delete.json',
    method: 'delete',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error) {
        if (cb) cb();
      } else {
        console.log('error');
        console.log(res.error)
      }
    });
}

function deletePollAnswer(answerId, cb) {
  apiCall({
    url: host + '/api/poll/question/answer/' + answerId + '/delete.json',
    method: 'delete',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error) if (cb) cb();
      else console.log(res.error)
    });
}

function getPollQuestions(pollId, cb) {
  apiCall({
    url: host + '/api/poll/' + pollId + '/results.json',
    method: 'get',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error && cb) cb(res);
      else console.log(res.error)
    });
}

function getPollAnswers(pollId, skip, limit, cb) {
  const pollLimit = typeof limit !== 'undefined' ? limit : 100;

  apiCall({
    url: host + '/api/poll/' + pollId + '/answers.json?limit=' + pollLimit + '&skip=' + skip,
    method: 'get',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error && cb) cb(res);
      else console.log(res.error)
    });
}

/*
* Fetching sum of all results
* */
function getCalculatedResults(pollId, questionId, cb) {
  apiCall({
    url: host + '/api/poll/' + pollId + '/question/' + questionId + '/results.json',
    method: 'get',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error && cb) cb(res);
      else console.log(res.error)
    });
}

/*
* Fetching all answers filtered by users
* */
function getAllUsersResults(pollId, skip, limit, cb) {
  apiCall({
    url: host + '/api/poll/' + pollId + '/user/results.json?skip=' + skip + '&liimit=' + limit,
    method: 'get',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error && cb) cb(res);
      else console.log(res.error)
    });
}

function getActivePoll(cb) {
  apiCall({
    url: host + '/api/poll/read.json',
    method: 'get',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  },)
    .then((res) => {
      if (!res.error && cb) cb(res);
      else console.log(res.error)
    });
}

module.exports = {
  host,
  initSurvey,
  setSurveyData,
  createSurveyDOM,
  createSurveyPage,
  showStartingScreen,
  showThankyouPage,
  startSurvey,
  showActivePage,
  euidv4Gen,
  answerClickHandler,
  submitAnswerHandler,
  setCookie,
  getCookie,
  eraseCookie,
  destroySurvey,
  minMaxSurvey,
  registerSurveyEventListeners
};
