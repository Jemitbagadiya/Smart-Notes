// // Frontend JavaScript
// document.addEventListener('DOMContentLoaded', () => {
//     // Fetch blog details from the backend using POST request
//     fetch('/blogs', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         }
//     })
//         .then(response => response.json())
//         .then(blogs => {
//             // Iterate through the fetched blogs and dynamically populate the HTML
//             const mainElement = document.querySelector('main');
//             console.log("blogs = ", blogs);
//             blogs.forEach(blog => {

//                 const createdAt = new Date(blog.createdAt);
//                 const formattedDate = `${getMonthName(createdAt.getMonth())} ${createdAt.getDate()}, ${createdAt.getFullYear()}`;

//                 const blogLink = `/blog/${blog.blogId}`;
//                 const article = document.createElement('article');
//                 article.innerHTML = `
//                     <h2 style="color: #174C7E;">${blog.title}</h2>
//                     <p>${formattedDate} posted by ${blog.author.username}</p>
//                     <a href="${blogLink}">Read more</a>
//                 `;
//                 mainElement.appendChild(article);
//             });
//         })
//         .catch(error => console.error('Error fetching blog details:', error));
// });

document.addEventListener('DOMContentLoaded', () => {
    // Fetch blog details from the backend using POST request
    fetch('/blogs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(blogs => {
        // Iterate through the fetched blogs and dynamically populate the HTML
        const mainElement = document.querySelector('main');
        console.log("blogs = ", blogs);
        blogs.forEach(blog => {
            const createdAt = new Date(blog.createdAt);
            const formattedDate = `${getMonthName(createdAt.getMonth())} ${createdAt.getDate()}, ${createdAt.getFullYear()}`;
            const blogLink = `/blog/${blog.blogId}`;
            const article = document.createElement('article');
            article.innerHTML = `
                <h2 style="color: #174C7E;">${blog.title}</h2>
                <p>${formattedDate} posted by ${blog.author.username}</p>
                <a href="${blogLink}">Read more</a>
            `;
            mainElement.appendChild(article);
        });
    })
    .catch(error => console.error('Error fetching blog details:', error));
});

// Function to get month name from month index
function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
}
