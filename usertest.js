/*global Meteor, Template, Deps, Npm, YAML, Router, Session */
/*
# Parameters

user:
The name of the test subject.

condition: 
A numerical value that determines which articles to show the
dashboard and keypoints for.
*/
Submissions = new Meteor.Collection("submissions");
Subjects = new Meteor.Collection("Subjects");
Articles = new Meteor.Collection("articles");
var tasks = [
  "Identify the disease(s) reported on in the article.",
  "Who contracted the disease(s) reported?",
  "Was there something novel or unusual about the infections reported?",
  "Which geographic regions are at risk for experiencing outbreaks of the reported disease(s)? Are you aware of any that were not reported in the article?",
  "Which host organisms have the potential to spread the reported disease(s)? Are you aware of any that were not reported in the article?",
  "Which demographics are at risk of contracting the reported disease(s)? Are you aware of any that were not reported in the article?",
  "What are the risk factors for contracting the reported disease(s)? Are you aware of any that were not reported in the article?",
  "Relative to other infectious disease events you have learned about, how much of a threat is posed by the events reported in this article?"
];

Router.map(function() {
  this.route('main', {
    path: '/',
    onRun: function(){
      if (!('user' in this.params)) {
        alert("No user name");
        throw Error();
      }
      var userName = this.params.user;
      var condition = this.params.condition;
        Meteor.subscribe("Subjects", {
        onReady : function() {
          Deps.autorun(function() {
            var user = Subjects.findOne({userName : userName});
            if (!user) {
              Subjects.insert({
                userName : userName,
                taskIdx : -1,
                articleIdx : 0,
                condition : parseInt(condition, 10)
              });
            } else {
              Session.set("user", user);
            }
          });
        }
      });
    }
  });
  this.route('showArticle', {
    path: '/showArticle/:idx',
    data: function(){
      return Articles.findOne({'idx' : Number(this.params.idx)});
    }
  });
  this.route('submissions', {
    path: '/submissions',
    data: function(){
      return { 
        submissions : Submissions.find().map(function(x){
          return {
            text : _.map(x, function(value, key){
              return key + ": " + value;
            }).join('\n')
          };
        })
      };
    }
  });
});

if (Meteor.isClient) {
  Meteor.subscribe('articles');
  Meteor.subscribe('submissions');
  var taskStart = new Date();
  
  var showDashboard = function () {
    var user = Session.get('user');
    if(!user) return null;
    if(user.condition === 0) {
      return user.articleIdx !== 0;
    } else {
      return user.articleIdx !== 1;
    }
  };
  Template.main.showDashboard = showDashboard;
  
  var showKeypoints = function () {
    var user = Session.get('user');
    if(!user) return null;
    if(!showDashboard()) return false;
    if(user.condition === 0) {
      return user.articleIdx % 2 === 0;
    } else {
      return user.articleIdx % 2 === 1;
    }
  };
  
  Template.main.task = function () {
    var user = Session.get('user');
    if(!user) return null;
    return tasks[user.taskIdx];
  };
  
  
  Template.main.article = function () {
    var user = Session.get('user');
    if(!user) return null;
    return Articles.findOne({'idx' : user.articleIdx});
  };
  
  Template.main.completed = function () {
    var user = Session.get('user');
    if(!user) return false;
    return Articles.find().count() > 0 && Articles.findOne({
      idx : user.articleIdx
    }) == null;
  };
  
  Template.main.articleLink = function (article) {
    if(showDashboard()) {
      return "https://grits.ecohealth.io/dash/" + article.dashboardId +
        (showKeypoints() ? "?showKeypoints=true" : "");
    } else {
      return "/showArticle/" + article.idx;
    }
  };

  Template.main.events({
    'click .next': function () {
      if(confirm(
        "Are you sure you want to go to the next task?\n" + 
        "You will not be able to return to this task."
      )) {
        var user = Session.get('user');
        Submissions.insert({
          userId : user._id,
          userName : user.userName,
          condition : user.condition,
          submissionTime : new Date(),
          showDashboard : showDashboard(),
          showKeypoints : showKeypoints(),
          taskStart : taskStart,
          taskIdx : user.taskIdx,
          taskText : tasks[user.taskIdx],
          articleIdx : user.articleIdx,
          articleLink : Articles.findOne({'idx' : user.articleIdx}).url,
          taskResult : $('#task-result').val()
        });
        $('#task-result').val('');
        taskStart = new Date();
        if(user.taskIdx + 1 >= tasks.length) {
          Subjects.update(Session.get('user')._id, {
            $inc: { articleIdx : 1 },
            $set: { taskIdx : -1 }
          });
        } else {
          Subjects.update(user._id, {$inc: { taskIdx : 1 }});
        }
      }
    },
    'click .next-article': function () {
      taskStart = new Date();
      Subjects.update(Session.get('user')._id, {
        $set: { taskIdx : 0 }
      });
    }
  });
}

if (Meteor.isServer) {
  var fs = Npm.require('fs');
  var directory = "../../../../../articles/";
  Articles.remove({});
  fs.readdirSync(directory, 'utf8').forEach(function(filename){
    try {
      var data = YAML.safeLoad(fs.readFileSync(directory + filename, 'utf8'));
      console.log("Loaded articleIdx: " + data.idx);
      Articles.insert(data);
    } catch (e) {
      console.log(e);
    }
  });
  Meteor.publish("Subjects", function(){
    return Subjects.find();
  });
  Meteor.publish('articles',function(){
    return Articles.find();
  });
  Meteor.publish("submissions", function(){
    var user = Meteor.users.findOne(this.userId);
    if(!user) return [];
    if(user.username !== "admin") return [];
    return Submissions.find();
  });
}
