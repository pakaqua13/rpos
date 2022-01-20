module.exports = {
    isOwner:function(req, res){
        if(req.session.is_logined){
            return true;
        } else{
            return false;
        }
    },
    statusUI:function(req, res){
        var authStatusUI = `<a href="/auth/login">login</a>`
        if(this.isOwner(req, res)){
            authStatusUI= `${req.session.nickname} | <a href="/auth/logout">logout</a>`
        }
        return authStatusUI
    }
    
}