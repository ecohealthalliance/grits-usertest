/*global Meteor, Template, SimpleSchema, Submissions, Users, Npm, YAML, Articles, Router, Session */
Submissions = new Meteor.Collection("submissions");
Users = new Meteor.Collection("users");
Articles = new Meteor.Collection("articles");
var tasks = [
  "Identify the disease(s) reported on in the article.",
  "Who contracted the disease(s) reported?",
  "Was there something novel or unusual about the infections reported?",
  "Which geographic regions are at risk for experiencing outbreaks of the reported disease(s)?",
  "Which are probable risk factors for contracting the reported disease(s)?",
  "Which demographics are at risk for the reported disease(s)?",
  "Estimate the number of infections that will occur in the next 30 days after the article's publication."
]

Router.map(function() {
  this.route('main', {
    path: '/',
    onRun: function(){
      if (!('user' in this.params)) {
        alert("No user name");
        throw Error();
      }
      var userName = this.params.user;
      var user = Users.findOne({userName : userName});
      var userId;
      if (!user) {
        Session.set('userId', Users.insert({
          userName : userName,
          taskIdx : 0,
          articleIdx : 0
        }));
      } else {
        Session.set('userId', user._id);
      }
      Session.set('condition', 'a');
    }
  });
  this.route('showArticle', {
    path: '/showArticle/:idx',
    data: function(){
      console.log(this.params);
      return Articles.findOne({'idx' : Number(this.params.idx)});
    }
  });
});

if (Meteor.isClient) {
  var taskStart = new Date();
  
  var showDashboard = function () {
    var user = Users.findOne(Session.get('userId'));
    if(!user) return null;
    return user.articleIdx % 3 === Session.get('condition');
  };
  
  Template.main.task = function () {
    var user = Users.findOne(Session.get('userId'));
    if(!user) return null;
    return tasks[user.taskIdx];
  };

  Template.main.events({
    'click .next': function () {
      if(confirm("Go to next task?")) {
        var user = Users.findOne(Session.get('userId'));
        //TODO: Submit
        Submissions.insert({
          userId : Session.get('userId'),
          condition : Session.get('condition'),
          submissionTime : new Date(),
          showDashboard : showDashboard(),
          taskStart : taskStart,
          taskIdx : user.taskIdx,
          articleIdx : user.articleIdx,
          taskResult : $('#task-result').val()
        });
        $('#task-result').val('');
        taskStart = new Date();
        Users.update(Session.get('userId'), {$inc: { taskIdx : 1 }});
      }
    },
    'click .next-article': function () {
      Users.update(Session.get('userId'), {
        $inc: { articleIdx : 1 },
        $set: { taskIdx : 0 }
      });
    }
  });

  Template.main.article = function () {
    var user = Users.findOne(Session.get('userId'));
    if(!user) return null;
    return Articles.findOne({'idx' : user.articleIdx});
  };
  
  Template.main.completed = function () {
    var user = Users.findOne(Session.get('userId'));
    if(!user) return false;
    return Articles.find({
      $in : [user.articleIdx, user.articleIdx - 1]
    }).count() === 1;
  };
  
  Template.main.showDashboard = showDashboard;
}

if (Meteor.isServer) {
  var fs = Npm.require('fs');
  var directory = "../../../../../articles/";
  Articles.remove({});
  fs.readdirSync(directory, 'utf8').forEach(function(filename){
    try {
      var data = YAML.safeLoad(fs.readFileSync(directory + filename, 'utf8'));
      console.log(data);
      Articles.insert(data);
    } catch (e) {
      console.log(e);
    }
  });
}
