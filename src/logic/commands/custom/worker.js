const cpc = require("../../../modules/cpc")(process);

const log = require("../../../modules/log");

const lexer = require("./lexer");
const parser = require("./parser");
const Interpreter = require("./interpreter/Interpreter");

async function compileCC(text) {
    // Tokenize the input
    const lexer_result = lexer.tokenize(text);
    if (lexer_result.errors.length > 0)
        throw lexer_result.errors;
    
    // 2. Parse the Tokens vector.
    parser.input = lexer_result.tokens;
    parser.text_input = text;
    const cst = parser.Program();

    if (parser.errors.length > 0)
        throw parser.errors;
    
    return cst; 
}

async function runCC(commandId, text, cst, message) {
    const interpreter = new Interpreter(commandId, message.guild.id);

    try {
        // 3. Perform semantics using a CstVisitor.
        // Note that separation of concerns between the syntactic analysis (parsing) and the semantics.
        interpreter.text_input = text;
        // interpreter.visit(cst);
        return {
            reply: await interpreter.visit(cst, message)
        };
    } catch (error) {
        return { error };
    }
}

cpc.answer("compile", async payload => {
    const { text } = payload;

    let errors = [];
    let cst = undefined;
    try {
        cst = compileCC(text);
    } catch (errs) {
        errors = errs;
    }

    return {
        cst,
        errors
    };
});

cpc.answer("run", async ({ id, text, cst, message }) => {
    return runCC(id, text, cst, message);
});

const text = `
if ($args.size() >= 2) { // checks if the args passed to the command are 2 or more
    channel = Channel($args[0]); // takes the first argument and turns it into a Channel object
    // take all args from the 2nd (1st in computer math, because computers start counting from 0) element on
    message = $args.slice(1);
    embed = RichEmbed()
        .setTitle("Broadcast!")
        .setDescription(message)
        .setColor(0xffcc00)
        .setFooter("This broadcast was sent by " + $user.username);

    channel.send(embed);

    reply "Broadcast sent!";
} else {
    reply "Correct usage of the command: \`!bc <#channel> <message>\`"
}
`;

const message = {
    msg: {
        id: "34534364",
        member: {
            id: "45654323456",
            nickname: "Lone",
            highestRole: {
                id: "8348324242",
                permissions: 0b101110010,
                position: 0,
                color: 0xffffff,
                createdAt: Date.now(),
                mentionable: false,
                name: "owo"
            },
            joinedAt: Date.now(),
            avatar: "https://cdn.discordapp.com/avatars/256788564078100482/a65a2147f45327fd71139cb4c094b3a0.png?size=512",
            bot: false,
            createdAt: Date.now(),
            username: "Loneless",
            discriminator: "0893",
            permissions: 0b101110010
        },
        channel: {
            id: "3456765432",
            name: "owochannel",
            createdAt: Date.now(),
            position: 1,
            nsfw: false,
            topic: "topic is this"
        },
        text: "!command hiyoooo nice",
        createdAt: Date.now(),
        editedAt: Date.now(),
        mentions: {
            members: [],
            channels: [],
            roles: [],
            everyone: false
        },
        pinned: false,
        reactions: [{
            count: 1,
            emoji: {
                animated: false,
                name: "ok_hand",
                requiresColons: true
            }
        }]
    },
    args: ["hiyoooo", "nice"],
    guild: {
        id: "453520653",
        name: "The Server",
        createdAt: Date.now(),
        icon: "https://cdn.discordapp.com/avatars/256788564078100482/a65a2147f45327fd71139cb4c094b3a0.png?size=512",
        memberCount: 2,
        ownerId: "4565302345"
    }
};

const cst = compileCC(text);
cst.then(cst => {
    const reply = runCC("test", text, cst, message);
    reply.then(reply => console.log(reply));
});