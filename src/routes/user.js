const { User, validate } = require('../models/user');
const updateDb = async(sessionId, textout, textIn, lists) => {
    let name;
    let email;
    let contact;
    let property_type;
    let preferred_area;
    let selected_list;
    let schedule_day;
    let schedule_time;
    let inspection;
    let bedrooms;
    if (textout.includes('service areas')) {
        property_type = textIn
    } else
    if (textout.includes('bedrooms')) {
        preferred_area = textIn
    } else
    if (textout.includes('the listing')) {
        bedrooms = Number(textIn)
    } else
    if (textout.includes('day')) {
        inspection = textIn == 'yes'
    } else
    if (textout.includes('your contact number')) {
        email = textIn
    } else
    if (textout.includes('your email address')) {
        name = textIn
    } else
    if (textout.includes('successfully')) {
        contact = textIn
    } else if (textout.includes('schedule an inspection')) {
        selected_list = textIn
    } else
    if (textout.includes('time')) {
        schedule_day = textIn
    } else if (textout.includes('your name')) {
        let words = textout.split(' ')
        schedule_time = words[9]
        schedule_day = words[7]
    }
    let user = await User.findOne({ session_id: sessionId });
    if (user) {
        const res = await User.updateOne({ session_id: sessionId }, {
            $set: {
                name: name ? name : user.name,
                email: email ? email : user.email,
                contact: contact ? contact : user.contact,
                property_type: property_type ? property_type : user.property_type,
                preferred_area: preferred_area ? preferred_area : user.preferred_area,
                selected_list: selected_list ? selected_list : user.selected_list,
                schedule_day: schedule_day ? schedule_day : user.schedule_day,
                schedule_time: schedule_time ? schedule_time : user.schedule_time,
                inspection: inspection ? inspection : user.inspection,
                bedrooms: bedrooms ? bedrooms : user.bedrooms
            }
        });
    } else {
        const res = new User({
            session_id: sessionId
        });
        await res.save();
    }
}
const userList = async() => {
    return await User.find();
}
module.exports = {
    updateDb,
    userList
};