//  import "../src/database"
import { onInteractionCreate, TEST_SERVER } from "../src";
// import mongoose from "mongoose";
import { verifyKey, InteractionResponseType, InteractionType, InteractionResponseFlags } from "discord-interactions";
import { verify } from "../src/verify";
import { APIInteractionResponse, ApplicationCommand, ApplicationCommandType, AutocompleteInteraction, BaseInteraction, ButtonInteraction, ChannelSelectMenuInteraction, ChatInputCommandInteraction, Client, ComponentType, Events, GatewayIntentBits, MentionableSelectMenuInteraction, MessageContextMenuCommandInteraction, ModalSubmitInteraction, Partials, RoleSelectMenuInteraction, StringSelectMenuInteraction, UserContextMenuCommandInteraction, UserSelectMenuInteraction } from "discord.js";



export async function GET(req: Request) {
    const signature = req.headers.get('X-Signature-Ed25519');
    const timestamp = req.headers.get('X-Signature-Timestamp');
    const isValidRequest = await verifyKey(await req.text(), signature, timestamp, 'MY_CLIENT_PUBLIC_KEY');
    if (!isValidRequest) {
        return new Response("Bad request signature", { status: 400, })
    }
    // mongoose.connection.close();
    return new Response(`Hello from ${process.env.VERCEL_REGION} ${TEST_SERVER}`);
}


export async function POST(req: Request) {
    //  console.log(mongoose)
    //  console.log(mongoose.connection)
    const txt = await req.text()
    await verify(req, txt)
    console.log("body", req.body)
    console.log(req)
    console.log("txt", txt)
    const message = JSON.parse(txt) as { type: InteractionType, data: APIInteractionResponse };

    if (message.type === InteractionType.APPLICATION_COMMAND) {
        console.log("the command is an applicaiton responding", message)
        console.log("resoonding with type", InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE)

        const a = new InteractionCreateAction(new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] }))
        const i = a.handle(message.data)
        console.log("this is I", i)
        // console.log("this is i name", i.commandName)

        await onInteractionCreate(i)


        return Response.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Hello world',
            }
        })
    }

    if (message.type === InteractionType.PING) {
        console.log("ping", message)

        // return new Response(JSON.stringify({
        //     type: InteractionResponseType.PONG,
        // }))

        return Response.json({ type: InteractionResponseType.PONG, })
    }
}



class GenericAction {
    client: any;
    constructor(client) {
        this.client = client;
    }

    handle(data) {
        return data;
    }

    getPayload(data, manager, id, partialType, cache?) {
        return this.client.options.partials.includes(partialType) ? manager._add(data, cache) : manager.cache.get(id);
    }

    getChannel(data) {
        const payloadData: { recipients?: any[]; id?: string } = {};
        const id = data.channel_id ?? data.id;

        if (!('recipients' in data)) {
            // Try to resolve the recipient, but do not add the client user.
            const recipient = data.author ?? data.user ?? { id: data.user_id };
            if (recipient.id !== this.client.user.id) payloadData.recipients = [recipient];
        }

        if (id !== undefined) payloadData.id = id;

        return (
            data[this.client.actions.injectedChannel] ??
            this.getPayload({ ...data, ...payloadData }, this.client.channels, id, Partials.Channel)
        );
    }

    getMessage(data, channel, cache) {
        const id = data.message_id ?? data.id;
        return (
            data[this.client.actions.injectedMessage] ??
            this.getPayload(
                {
                    id,
                    channel_id: channel.id,
                    guild_id: data.guild_id ?? channel.guild?.id,
                },
                channel.messages,
                id,
                Partials.Message,
                cache,
            )
        );
    }

    getReaction(data, message, user) {
        const id = data.emoji.id ?? decodeURIComponent(data.emoji.name);
        return this.getPayload(
            {
                emoji: data.emoji,
                count: message.partial ? null : 0,
                me: user?.id === this.client.user.id,
            },
            message.reactions,
            id,
            Partials.Reaction,
        );
    }

    getMember(data, guild) {
        return this.getPayload(data, guild.members, data.user.id, Partials.GuildMember);
    }

    getUser(data) {
        const id = data.user_id;
        return data[this.client.actions.injectedUser] ?? this.getPayload({ id }, this.client.users, id, Partials.User);
    }

    getUserFromMember(data) {
        if (data.guild_id && data.member?.user) {
            const guild = this.client.guilds.cache.get(data.guild_id);
            if (guild) {
                return guild.members._add(data.member).user;
            } else {
                return this.client.users._add(data.member.user);
            }
        }
        return this.getUser(data);
    }

    getScheduledEvent(data, guild) {
        const id = data.guild_scheduled_event_id ?? data.id;
        return this.getPayload(
            { id, guild_id: data.guild_id ?? guild.id },
            guild.scheduledEvents,
            id,
            Partials.GuildScheduledEvent,
        );
    }

    getThreadMember(id, manager) {
        return this.getPayload({ user_id: id }, manager, id, Partials.ThreadMember, false);
    }
}



class InteractionCreateAction extends GenericAction {

    handle(data) {
        const client = this.client;

        // Resolve and cache partial channels for Interaction#channel getter
        const channel = data.channel && this.getChannel(data.channel);

        // Do not emit this for interactions that cache messages that are non-text-based.
        let InteractionClass;

        switch (data.type) {
            case InteractionType.APPLICATION_COMMAND:
                switch (data.data.type) {
                    case ApplicationCommandType.ChatInput:
                        InteractionClass = ChatInputCommandInteraction;
                        break;
                    case ApplicationCommandType.User:
                        InteractionClass = UserContextMenuCommandInteraction;
                        break;
                    case ApplicationCommandType.Message:
                        if (channel && !channel.isTextBased()) return;
                        InteractionClass = MessageContextMenuCommandInteraction;
                        break;
                    default:
                        client.emit(
                            Events.Debug,
                            `[INTERACTION] Received application command interaction with unknown type: ${data.data.type}`,
                        );
                        return;
                }
                break;
            case InteractionType.MESSAGE_COMPONENT:
                if (channel && !channel.isTextBased()) return;

                switch (data.data.component_type) {
                    case ComponentType.Button:
                        InteractionClass = ButtonInteraction;
                        break;
                    case ComponentType.StringSelect:
                        InteractionClass = StringSelectMenuInteraction;
                        break;
                    case ComponentType.UserSelect:
                        InteractionClass = UserSelectMenuInteraction;
                        break;
                    case ComponentType.RoleSelect:
                        InteractionClass = RoleSelectMenuInteraction;
                        break;
                    case ComponentType.MentionableSelect:
                        InteractionClass = MentionableSelectMenuInteraction;
                        break;
                    case ComponentType.ChannelSelect:
                        InteractionClass = ChannelSelectMenuInteraction;
                        break;
                    default:
                        client.emit(
                            Events.Debug,
                            `[INTERACTION] Received component interaction with unknown type: ${data.data.component_type}`,
                        );
                        return;
                }
                break;
            case InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE:
                InteractionClass = AutocompleteInteraction;
                break;
            case InteractionType.MODAL_SUBMIT:
                InteractionClass = ModalSubmitInteraction;
                break;
            default:
                client.emit(Events.Debug, `[INTERACTION] Received interaction with unknown type: ${data.type}`);
                return;
        }

        const interaction = new InteractionClass(client, data);

        /**
         * Emitted when an interaction is created.
         * @event Client#interactionCreate
         * @param {BaseInteraction} interaction The interaction which was created
         */
        //   client.emit(Events.InteractionCreate, interaction);
        return interaction;
    }
}


//   class Test extends InteractionCreateAction {
//     constructor( d) {
//         super(d)
//     }
// }
