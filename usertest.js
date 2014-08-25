/*global Meteor, Template, SimpleSchema, Submissions, Users, Npm, YAML, Articles, Router, Session */
Submissions = new Meteor.Collection("submissions");
Users = new Meteor.Collection("users");
Articles = new Meteor.Collection("articles");
var tasks = [
  "Identify the diseases mentioned in an article.",
  "Make predictions about where the next reports of a disease are likely to come from, when they will occur, how many cases will be reported, and who will be infected.",
  "Identify outbreak risk factors based on the information present in an article.",
  "Determine the number of cases reported in an article.",
  "Identify new information in an article (e.g. case counts, locations) that wasn't present in previously shown articles."
]

Router.map(function() {
  this.route('', {
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
      if('showDashboard' in this.params) {
        Session.set('showDashboard', true);
      }
    }
  });
});

if (Meteor.isClient) {
  var taskStart = new Date();
  
  Template.main.task = function () {
    var user = Users.findOne(Session.get('userId'));
    if(!user) return null;
    return tasks[user.taskIdx];
  };

  Template.main.events({
    'click .next': function () {
      if(confirm("Go to next task?")) {
        //TODO: Submit
        Submissions.insert({
          userId : Session.get('userId'),
          submissionTime : new Date(),
          taskStart : taskStart,
          taskResult : $('#task-result').val()
        });
        $('#task-result').val('')
        taskStart = new Date();
        Users.update(Session.get('userId'), {$inc: { taskIdx : 1 }})
      }
    },
    'click .next-article': function () {
      Users.update(Session.get('userId'), {
        $inc: { articleIdx : 1 },
        $set: { taskIdx : 0 }
      })
    }
  });

  Template.main.article = function () {
    var user = Users.findOne(Session.get('userId'));
    if(!user) return null;
    return Articles.findOne({'idx' : user.articleIdx});
  };
  Template.main.showDashboard = function () {
    return Session.get('showDashboard');
  };
}

if (Meteor.isServer) {
  var fs = Npm.require('fs');
  var directory = "../../../../../articles/";
  fs.readdirSync(directory, 'utf8').forEach(function(filename){
    try {
      var data = YAML.safeLoad(fs.readFileSync(directory + filename, 'utf8'));
      console.log(data);
      Articles.remove({});
      Articles.insert(data);
    } catch (e) {
      console.log(e);
    }
  });
}
