export const enrichGameListMock = async (gameList) => {
    console.log("Mock AI: Enriching game list with mocked data.");
    return gameList.map(game => ({
        title: game.title,
        description: `Mock description for ${game.title}. This is a test.`, 
        genre: 'Mock Genre',
        release: '2024-01-01'
    }));
};