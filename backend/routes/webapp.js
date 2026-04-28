const express = require("express");
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/user.modal');
const Blog = require('../models/blog.modal');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// middlewares
const cors = require('cors'); // Import the cors middleware
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const isLogIn = require('../middleware/Auth.js');

const secret = require("../config.js");
const generateBlogId = require('../Utils/generateBlogId.js');
const { sendEmail } = require('../Utils/send_email.js')
const { sendOTP, generateOTP } = require('../Utils/send_otp.js')
var otpStore = {};

// Connect to MongoDB
mongoose.connect('mongodb://jemit:1234@ac-anun5kd-shard-00-00.t6oeg7f.mongodb.net:27017,ac-anun5kd-shard-00-01.t6oeg7f.mongodb.net:27017,ac-anun5kd-shard-00-02.t6oeg7f.mongodb.net:27017/notesDB?ssl=true&replicaSet=atlas-10dr52-shard-0&authSource=admin&retryWrites=true&w=majority')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

// Login route
app.post("/loginEvent", async (req, res) => {
    console.log("in /loginEvent")

    const { username, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ username });
        console.log("username = ", username);
        console.log("user = ", user);
        if (user) {
            // Compare the provided password with the hashed password stored in the database
            const passwordMatch = await bcrypt.compare(password, user.password);
            console.log(passwordMatch);

            if (passwordMatch) {
                // Passwords match, generate JWT token
                const token = jwt.sign({
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    randomNumber: Math.floor(1000 + Math.random() * 9000),
                    createdAt: new Date(),
                }, secret, { expiresIn: 60 * 60 * 24 * 30 * 2 });

                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 2);
                res.cookie('token', token, {
                    httpOnly: true,
                    sameSite: 'lax',
                    expires: expiryDate
                });

                // Send JWT token in response
                res.status(200).json({ success: true });
            } else {
                // Passwords don't match
                res.status(401).json({ success: false, message: 'Invalid username or password1' });
            }
        } else {
            // User not found
            res.status(401).json({ success: false, message: 'Invalid username or password2' });
        }
    } catch (error) {
        // Error handling
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internalll server error' });
    }
});

// Signup route
app.post("/signupEvent", async (req, res) => {

    const { username, email, password } = req.body;
    // role = 'user';
    // verified_email = 'no';

    console.log(username);
    console.log(email);
    console.log(password);
    // console.log(role);

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        const existingEmail = await User.findOne({ email });

        console.log("existingUser : ", existingUser);
        console.log("existingEmail : ", existingEmail);

        if (existingUser || existingEmail) {
            // User already exists
            res.status(409).json({ success: false, message: 'User already exists' });
        } else {
            // Create new user
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = new User({ username, email, password: hashedPassword });
            await newUser.save();

            // Generate JWT token for new user
            // const token = jwt.sign({
            //     username: newUser.username,
            //     email: newUser.email,
            //     role: newUser.role,
            //     randomNumber: Math.floor(1000 + Math.random() * 9000),
            //     createdAt: new Date(),
            // }, secret, { expiresIn: 60 * 60 * 24 * 30 * 2 }); // 60 seconds * 60 minutes * 24 hours * 30 days * 2 months 

            // Send JWT token in response
            res.status(201).json({ success: true });
            console.log(newUser.email);

            var emailForVerification = newUser.email;
            otpStore[emailForVerification] = generateOTP(4);
            console.log(otpStore[emailForVerification]);
            sendOTP(emailForVerification, otpStore[emailForVerification]);
        }
    } catch (error) {
        // Error handling
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post("/verifyEvent", async (req, res) => {
    const { otp, emailForVerification } = req.body;
    console.log("emailForVerification = ", emailForVerification);

    try {
        // Find the user by email
        const user = await User.findOne({ email: emailForVerification });
        console.log("user = ", user);

        if (!user) {
            // User not found
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        console.log("comparing both otp");
        console.log("otp = ", otp);
        console.log("otpStore[emailForVerification] = ", otpStore[emailForVerification]);
        // Compare the entered OTP with the OTP sent to the user
        if (otp === otpStore[emailForVerification]) {
            console.log("Inside comparing");
            // OTP verification successful
            // Generate JWT token for the user
            user.verified_email = "yes";
            await user.save();

            const token = jwt.sign({
                username: user.username,
                email: user.email,
                role: user.role,
                randomNumber: Math.floor(1000 + Math.random() * 9000),
                two_fa: user.two_fa, // Set two_fa flag to true
                verified_email: user.verified_email // Set verified_email flag to true
            }, secret, { expiresIn: 60 * 60 * 24 * 30 * 2 }); // Set expiry time as needed

            // Set JWT as HTTPOnly cookie
            res.cookie('token', token, {
                httpOnly: true,
                sameSite: 'lax'
            });

            // Return success response
            return res.status(200).json({ success: true });
        } else {
            // Incorrect OTP
            return res.status(401).json({ success: false, message: 'Invalid OTP' });
        }
    } catch (error) {
        // Error handling
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post("/forgotPasswordEvent", async (req, res) => {
    console.log("this route")
    const { username } = req.body.requestBodyForForgotPassword;

    const user = await User.findOne({ username }, { email: 1 });
    console.log("email = ", user.email);

    if (!user) {
        // If user not found, return an error response
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log("username = ", username);
    otpStore[user.email] = generateOTP(4);
    console.log(otpStore[user.email]);
    sendOTP(user.email, otpStore[user.email]);

    res.status(200).json({ success: true, email: user.email });
});

app.post("/verifyOTPForForgotPasswordEvent", async (req, res) => {
    const { otp, emailForVerification } = req.body;

    console.log("otpStore[emailForVerification]", otpStore[emailForVerification])

    try {
        // Check if the received OTP matches the stored OTP
        if (otp === otpStore[emailForVerification]) {
            // OTP verification successful
            res.status(200).json({ success: true });
        } else {
            // Incorrect OTP
            res.status(401).json({ success: false });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post("/updatePasswordEvent", async (req, res) => {
    const { email, password } = req.body;

    console.log(email);
    console.log(password);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Find the user by email and update the password
        const user = await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true });

        if (user) {
            // Password updated successfully
            // Generate JWT token
            const token = jwt.sign({
                username: user.username,
                email: user.email,
                role: user.role,
                randomNumber: Math.floor(1000 + Math.random() * 9000),
                two_fa: user.two_fa, // Set two_fa flag to true
                verified_email: user.verified_email // Set verified_email flag to true
            }, secret, { expiresIn: 60 * 60 * 24 * 30 * 2 }); // Set expiry time as needed

            // Set JWT as HTTPOnly cookie
            res.cookie('token', token);

            // Return success response
            res.status(200).json({ success: true });
        } else {
            // User not found
            res.status(404).json({ success: false });
        }
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ success: false });
    }
});

app.get('/getUserDetails', isLogIn, (req, res) => {
    // Assuming user details are stored in the request object after authentication
    console.log("req came /getUserDetails");

    const { username, email } = req.user;

    // Send the user details in the response
    res.json({ success: true, data: { username, email } });
});

app.get('/', (req, res) => {
    res.redirect('/index');
});

app.get('/dashboard', isLogIn, (req, res) => {
    // var pathOf = path.join(__dirname, 'frontend', 'views', 'pages', 'dashboard.html')
    // var path2 = path.resolve(__dirname);
    // console.log(path2);
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'dashboard.html');
    console.log("path = ", pathOf)
    // res.send("hii");
    res.sendFile(pathOf);
})

app.get('/about', (req, res) => {
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'about.html');
    res.sendFile(pathOf);
})

app.get('/contact', (req, res) => {
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'contact.html');
    res.sendFile(pathOf);
})

app.get('/feedback', (req, res) => {
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'feedback.html');
    res.sendFile(pathOf);
})

app.get('/team', (req, res) => {
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'team.html');
    res.sendFile(pathOf);
})

app.get('/forget_password1', (req, res) => {
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'forget_password1.html');
    res.sendFile(pathOf);
})

app.get('/forget_password2', (req, res) => {
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'forget_password2.html');
    res.sendFile(pathOf);
})

app.get('/index', (req, res) => {
    console.log("in /index")
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'index.html');
    res.sendFile(pathOf);
})

app.get('/signup_verification', (req, res) => {
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'signup_verification.html');
    res.sendFile(pathOf);
})

app.get('/signup', (req, res) => {
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'signup.html');
    res.sendFile(pathOf);
})

app.get('/editor', isLogIn, (req, res) => {
    console.log("in /editor");
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'blog_editor.html');
    res.sendFile(pathOf);
})

app.get('/explore_blog', (req, res) => {
    console.log("in /blog");
    var pathOf = path.resolve(__dirname, '..', '..', 'frontend', 'views', 'pages', 'explore_blog.html');
    res.sendFile(pathOf);
})

app.post('/blogs', async (req, res) => {
    try {
        // Query the database to fetch all blog details
        const blogs = await Blog.find({}, 'blogId title createdAt author').populate('author', 'username');
        console.log("blogs = ", blogs);
        res.json(blogs);
    } catch (error) {
        console.error('Error fetching blog details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch blog details' });
    }
});

app.post('/submitMyFeedback', (req, res) => {
    console.log("req came to /submitFeedback");
    const { email, subject, message } = req.body;

    sendEmail(email, subject, message);
    res.status(200).json({ success: true })
});

app.get('/blog/:blogId', async (req, res) => {
    console.log("Req came to /blog");
    const blogId = req.params.blogId;
    console.log("blogId = " + blogId);

    const mainFilePath = path.join(__dirname, '..', '..', 'frontend', 'views', 'layout', 'master_template.html');
    const blogFilePath = path.join(__dirname, '..', '..', 'frontend', 'Blogg', `${blogId}.html`);

    console.log("mainFilePath = " + mainFilePath);
    console.log("blogFilePath = " + blogFilePath);

    try {
        // Query the database to get blog details
        // const blog = await Blog.findById(blogId).populate('author');
        const blog = await Blog.findOne({ blogId: blogId }).populate('author');

        console.log("blog = " + blog);
        if (!blog) {
            return res.status(404).send('Blog post not found');
        }

        // Extract date and user from the blog object
        const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
        const formattedDate = new Intl.DateTimeFormat('en-US', dateOptions).format(blog.createdAt);
        const dateAndUser = `${formattedDate} posted by ${blog.author.username}`;

        // Read content of blog file
        fs.readFile(blogFilePath, 'utf8', (err, blogContent) => {
            if (err) {
                return res.status(404).send('Blog post not found');
            }

            // Read content of main file
            fs.readFile(mainFilePath, 'utf8', (err, mainContent) => {
                if (err) {
                    return res.status(500).send('Internal server error');
                }

                console.log("blogContent = " + blogContent);

                // Combine HTML content
                const combinedContent = mainContent.replace('{{content}}', blogContent)
                    .replace('{{dateAndUser}}', dateAndUser)
                    .replace('{{titleName}}', blog.title);

                // Send the combined HTML content
                res.send(combinedContent);
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

app.post('/submitBlog', isLogIn, async (req, res) => {
    const { blogTitle } = req.body;

    try {
        // Extract username from the decoded JWT payload attached by the isLogIn middleware
        const username = req.user.username;

        // Find the user by username to retrieve their ObjectId
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate a unique blogId
        const blogId = generateBlogId(); // Implement your own function to generate a unique blogId

        // Generate a filename based on the blogId
        const fileName = `${blogId}.html`;

        // Write the blog content to a file
        const filePath = path.join(__dirname, '../../frontend/blogg', fileName);
        fs.writeFile(filePath, req.body.blogContent, async (err) => {
            if (err) {
                console.error('Error writing blog file:', err);
                return res.status(500).json({ success: false, message: 'Failed to save blog content' });
            }

            // Create the blog object with blogId
            const blog = new Blog({
                blogId: blogId, // Save the generated blogId
                title: blogTitle,
                author: user._id // Use the ObjectId retrieved from the user object
            });

            // Save the blog object to the database
            await blog.save();

            // Send the generated blogId to the client-side
            res.status(201).json({ success: true, message: 'Blog submitted successfully', blogId: blogId });
        });
    } catch (error) {
        console.error('Error saving blog:', error);
        res.status(500).json({ success: false, message: 'Failed to submit blog' });
    }
});



const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
