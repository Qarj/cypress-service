function rndGroup() {
    const now = new Date();
    const time = pad(now.getUTCHours()) + '.' + pad(now.getUTCMinutes()) + '.' + pad(now.getUTCSeconds());
    const ms = now.getUTCMilliseconds();
    return `${time}.${ms}`;
}

function pad(str, pad = '00', padLeft = true) {
    if (typeof str === 'undefined') return pad;
    if (padLeft) {
        return (pad + str).slice(-pad.length);
    } else {
        return (str + pad).substring(0, pad.length);
    }
}

module.exports = {
    rndGroup,
};
