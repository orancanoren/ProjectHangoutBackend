var router = require('express').Router();
var passport = require('passport');
var User = require('../models/user');

// LOGIN
router.get('/', function(req, res) { // home page
    if (req.isAuthenticated()) {
        res.redirect('/profile');
    } else {
        res.render('index.ejs', { message: req.flash('loginMessage') });
    } 
});

router.post('/', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
}));

// SIGNUP
router.get('/signup', function(req, res) {
    if (req.isAuthenticated()) {
        res.redirect('/profile');
    } else {
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    }
});

router.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash: true
}));

// LIMITED PROFILE VIEW
router.get('/view/:id', function(req, res) {
    var targetId = parseInt(req.params.id);
    if (req.isAuthenticated() && req.user._id == targetId) {
        res.redirect('/profile');
        return;
    }
    User.getByCredId(targetId, function(err, user) {
        if (err == "user not found") {
            if (! req.isAuthenticated()) {
                req.flash('loginMessage', 'User doesn\'t exist');
                res.redirect('/');
            } else {
                req.flash('profileMessage', 'User doesn\'t exist');
                res.redirect('/profile');
            }
        }
        else if (err) {
            console.log(err);
            res.status(500).send("<h1>Internal Server Error</h1>");
        } else {
            User.getFollowCounts(targetId, function(err, counts) {
                if (err) {
                    console.log(err);
                    res.status(500).send('<h1>Internal Server Error</h1>');
                } else {
                    res.render('limitedView.ejs', {
                        fname: user.properties['fname'],
                        lname: user.properties['lname'],
                        bday: user.properties['bday'],
                        sex: user.properties['sex'],
                        numFollowers: counts[0]['numFollowers'],
                        numFollowing: counts[0]['numFollowing'],
                        message: req.flash('limitedViewMessage'),
                        id: targetId
                    });
                }
            });
        }
    });
});

router.get('/profile', function(req, res) {
    isLoggedIn(req, res);
    // TODO: Manage async clearly w/Streamline.js
    User.getFollowers(req.user._id, function(err, followers) {
        if (err) {
            console.log('ERROR: Couldn\'t get followers');
            res.status(500).send("<h1>Internal Server Error</h1>");
        } else {
            User.getFollowing(req.user._id, function(err, following) {
                if (err) {
                    console.log('ERROR: Couldn\'t get following');
                    res.status(500).send("<h1>Internal Server Error</h1>");
                } else {
                    res.render('profile.ejs', {
                        id: req.user._id,
                        fname: req.user.properties.fname,
                        lname: req.user.properties.lname,
                        bday: req.user.properties.bday,
                        sex: req.user.properties.sex,
                        email: req.user.properties.email,
                        following: following,
                        followers: followers,
                        message: req.flash('profileMessage')
                    });
                }
            });
        }
    });
});

router.get('/logout', function(req, res) {
    isLoggedIn(req, res);
    req.logout();
    res.redirect('/');
});

router.get('/follow/:id', function(req, res) {
    isLoggedIn(req, res);

    var target = parseInt(req.params.id);
    var selfId = parseInt(req.user._id);
    console.log(selfId + ' wants to follow ' + target);
    if (target == selfId) {
        console.log('same');
        req.flash('limitedViewMessage', 'You cannot follow yourself');
        res.redirect('/view/'+target);
    } else if (target == null) {
        req.flash('profileMessage', 'Cannot follow');
        res.redirect('/profile');
    } else {
        User.addUserRelationship('FOLLOW', selfId, target, function(err, rel) {
            if (err) {
                console.log(err);
                req.flash('profileMessage', 'following failed');
                res.redirect('/profile');
            } else {
                console.log(rel);
                req.flash('profileMessage', 'following success');
                res.redirect('/profile');
            }
            
        });
    }
});

function isLoggedIn(req, res) {
    if (! req.isAuthenticated()) { return res.redirect('/'); }
}

module.exports = router;