const express = require('express')
const app = express()
const mongoose = require('mongoose');
const {Schema} = mongoose;
const cors = require('cors');
require('dotenv').config()

//Connecting the database
mongoose.connect(process.env.MONGO_URL);

const UserSchema = new Schema({
  username: String,
});
UserSchema.set('toJSON', {
  transform: function (doc, ret){
    delete ret._v;
  }
});
const User = mongoose.model('User', UserSchema);

const ExerciseSchema = new Schema({
  user_id: {type: String, required:true},
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended:true}));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//POST API to add a new user to database
app.post('/api/users', async (req, res) =>{
  const {username} = req.body;
  try {
    const existingUser = await User.findOne({username});
    if(existingUser){
      return res.json({error: 'You are already an user'});
    }
    const addUser = new User({
      username,
    });

    await addUser.save();
    return res.json({
      username: username,
      user_id: addUser.id
    });

  } catch (error) {
    return res.json({error: 'Internal Server Error'});
  }
});

//GET API to retrieve all users
app.get('/api/users', async (req, res) =>{
  try {
    const users = await User.find();
    if(users.length === 0){
      return res.json([]);
    }
    return res.json(users);
  } catch (error) {
      return res.json({error: 'Internel Server error'});
  }
});

//POST API to add description,duration and date to database
app.post('/api/users/:_id/exercises', async (req, res) =>{
  const id = req.params._id;
  const {description, duration, date} = req.body;

  try {
    const user = await User.findById(id);
    if(!user){
      return res.json({error: 'Could not find user'});
    }
    const addExercise = new Exercise({
      user_id: user.id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    await addExercise.save();
    return res.json({
      _id: user._id,
      username: user.username,
      description: addExercise.description,
      duration: addExercise.duration,
      date: new Date(addExercise.date).toDateString()
    });
  } catch (error) {
    return res.json({error: 'Internel Server Error'});
  }
});

//GET API to retrieve full exercise log of user
app.get('/api/users/:_id/logs', async (req, res) =>{
  const {from, to, limit} = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if(!user){
    res.json({error: 'Could not find user'});
    return;
  }
  let dateObject = {};
  if(from){
    dateObject["$gte"] = new Date(from);
  }
  if(to){
    dateObject["$lte"] = new Date(to);
  }
  let filter = {
    user_id: id
  };
  if(from || to){
    filter.date = dateObject;
  }
  const exercises = await Exercise.find(filter).limit(+limit ?? 500);

  const log = exercises.map((e) =>({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));

  res.json({
    username: user.username,
    _id: user._id,
    count: exercises.length,
    log
  });
})

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})