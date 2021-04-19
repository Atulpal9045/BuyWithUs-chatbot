$(document).ready(function() {
    $('.chat_icon').click(function() {
        $('.chat-column').toggleClass('active');
    });

    $('.my-conv-form-wrapper').convform({ selectInputStyle: 'disable' })
});