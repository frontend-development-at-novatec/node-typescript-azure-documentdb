import { UserEntity } from './persistence/entities/UserEntity';
import UsersRepository from './persistence/UsersRepository';

doSomeDatabaseThings().catch((e) => console.error(e));

async function doSomeDatabaseThings(): Promise<void> {
    const key = 'test';

    console.log('Will initialize the database and everything else automatically with the first call.');
    let user = await UsersRepository.findByKey(key);

    if (user !== null) {
        console.log(`We found a ${user}. Update it with a new text.`);

        user = await UsersRepository.update(user, {
            $set: { text: 'new text' },
        });

        console.log(`We updated the ${user}`);
    } else {
        console.log(`User with key '${key}' not found.`);

        user = new UserEntity();
        user.id = '1';
        user.key = key;
        user.text = 'text';
        user.date = new Date();
        console.log(`This user will be created now: ${user}`);

        user = await UsersRepository.create(user);
        console.log(`Created user: ${user}`);
    }
}
